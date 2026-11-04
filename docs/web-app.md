# app/web 接入顶层设计

查阅时机：接会话列表、发送、全局 SSE、历史回放，或改前端性能边界（帧通知、Markdown 节流、Worker）时。块怎么画仍看 [web-conversation.md](web-conversation.md)。四区 shell 与 Composer 外壳仍看 [web.md](web.md)。服务端接口与上限仍看 [server.md](server.md)，字段以 [api.html](../app/server/test/html/api.html) 为准，本文不抄一份类型。

本文是当前方案，不是必须照做的合同。文档效力见 [AGENTS.md](../AGENTS.md) 的「开发记录规范」：实现改了就改文档；有问题或更合适的做法就提出来，用代码和测量核对。下面的 16ms、32ms、8ms 是当前取舍，改它们的条件写在「发布与绘制」。

服务端对话已经能用。侧栏、历史、发送、后台状态和模型选择已经接上。下面按块做，每次只做一块。

## 权威与三份状态

会话正文只有一份：pi 的 JSONL。读历史用 `GET /api/sessions/:id/history`（`buildSessionContext`）。线上增量用 `GET /api/sessions/events`，每条是 `{ sessionId, event }`，内层是 pi 的 `AgentSessionEvent`。前端不另存一套消息档案。`BlockFeedEvent` 是 UI 投影，不是协议。适配器放在 web 侧，把事件译成现有块，见 [web-conversation.md](web-conversation.md)。

```text
SSE / HTTP  →  按 sessionId 分流
                ├─ 目录（侧栏：状态、标题、时间）
                └─ 当前打开的那一条 → adapter → runtime → ConversationView
打开历史：history JSON → Worker 译成一份快照 → runtime.replace
```

三份状态分开存。目录 store 不放正文，侧栏不订阅当前会话的块。

- **目录**。侧栏一行：`id`、`cwd`、`name`、`firstMessage`、`created`、`modified`、`status`。`status` 只有 `idle` | `running`，与服务端一致。侧栏 mock 里的 success / failure 不进目录。展示标题：`name` 非空用 `name`，否则用 `firstMessage`。
- **当前会话**。现有 `ConversationSnapshot`。同一时刻 React 只挂这一份全文。切走就丢掉块树，再打开用历史重建。
- **草稿**。还没发送的新对话没有 sessionId，草稿只在内存里，按「当前这次新对话」存。刷新丢失可以接受。不写进会话文件。

重连：SSE 断线不补。重连或打开某条会话时，历史是权威。历史应用完成之后，才把这条的实时事件送进 runtime。拉历史期间到达的事件按 sessionId 留在短队列，历史落地后重放。避免先应用流、再盖上历史，把块写乱。

## 发布与绘制

现有 `createBlockRuntime` 把 `*_delta` 放进 `pending`，下一次 `requestAnimationFrame` 再 `apply` 并 `emit`。这是把两次绘制之间到达的增量合成一次通知，大约 16ms（60Hz）。字符串拼接不是热点。热点是：每次 `emit` 新建整份 `byKey`、React 重绘、以及 `Streamdown` 对未完成 Markdown 的整段重解析（代码高亮、公式、Mermaid）。

把「通知 React」和「把文本交给 Markdown」拆开。把通知再推迟到两帧或三帧，解析次数并不少，光标只是更晚一拍。

当前取舍：

- **内存追加**。每个 delta 到达就拼进该块文本。留在主线程。
- **通知 React**。下一帧，且一帧最多一次（约 16ms）。`user`、`*_start`、`*_end`、`run_*` 立刻 flush。流式结束的那一帧立刻把最终文本交给 `MarkdownView`，不吃下面的绘制节流，也不再补播淡入。
- **流式 Markdown**。块的 `contentPhase` 仍是 `open` 时，不把已收到的全文一次交给 `MarkdownView`。默认每 96ms（6 × 16ms）交一截前缀：落后不超过 32 个字时每拍 2 个字素，落后上限每次 ×2、每拍字数每次 ×3。围栏按行。新露出的字一起做 200ms 透明度淡入，见 [web-conversation.md](web-conversation.md) 的「滚动与流式出现」。流式期就挂代码块外壳，Mermaid 等这段结束再挂。结束后立刻用全文，眼前流过的块仍走分块 DOM。只有正在开着的那一块换文本。
- **结构共享**。接上真实流式时，`emit` 只替换正在写的那一块，不为它复制整份 `order` / `byKey`。现有 runtime 每次 flush 都新建整份 `byKey`，那是 mock 能用的写法，接 SSE 时要改。这比多等一帧更影响主线程。
- **高亮**。流式期挂代码外壳（含 Shiki），不算 Mermaid。这段结束后再挂 Mermaid。

上面是正式对话（`/`）和 `/chat` 共用的节奏，数在 `app/web/src/chat/pace.ts` 的 `defaultFeed`。`/chat` 右侧可以改第一档或改成「直接给」（跳过 `shown`，全文一到就进视图），改动只影响试验页。正式页固定用默认档。

改这些数字的条件：通知间隔只有在测量到「一帧一次的通知本身」超过预算时才加长，加长之前先确认贵的不是 Markdown。露出节奏改 `defaultFeed`。这一拍里新到的字一起淡入。若解析仍经常超过约 8ms，先确认 Mermaid 已经延后、完成块已不再解析，再考虑把解析移出主线程（见下节）。没量到之前不把解析搬进 Worker。

## Worker 与空闲时间

Worker 做「算一次、结果不参与当前这一帧」的事。打开历史时，把 history JSON 译成一份快照，一次 postMessage 回来。传字符串，或可转移的 buffer。主线程只 `replace` 一次。Worker 不可用就在主线程做同一件事。

token 流不进 Worker。每条增量拷进 Worker 再拷回来，比在主线程拼接字符串贵，而且晚一拍。

`Streamdown` 组件不进 Worker，它要产出 DOM。能挪的是解析。当前不挪。先做前缀露出、完成块不重解析、Mermaid 延后。这样做完之后，若单次流式解析仍经常超过约 8ms，再把「解析出 HTML 或 AST」放进 Worker，主线程只插入结果。没量到之前不另写一套 Markdown。

`requestIdleCallback` 不用于流式。流式时主线程忙，空闲回调要么排不上，要么积成一大段然后卡一下。空闲时间只给可以晚一点的目录工作（例如以后的搜索索引），并且带 timeout；超时就在下一帧做完，避免侧栏停在旧数据上。几百条会话的分桶和排序留在主线程，不为这个加 Worker。

后台会话：SSE 只改目录里的 `status`、`modified`，以及事件里确实带上的标题字段。没在看的那条结束时，侧栏另记成功或失败，点进去清掉，刷新丢掉；目录的 `status` 仍只有 `idle` | `running`。不为看不见的会话建块树，不跑 Markdown。

对话列仍不上虚拟列表，这是 [web-conversation.md](web-conversation.md) 的现结论。块数先把主线程打满时再评估窗口化，本文不预做。侧栏行高一致，会话多到滚动卡住时再虚拟化这一列。

Store 继续按字段切片订阅。做法见 [web-zustand-store-design.md](superpowers/specs/2026-09-11-web-zustand-store-design.md)（查阅时机：加 store、避免整店订阅时）。

## 传输

全应用一条 `GET /api/sessions/events`。发送、中止、列表、历史、改名走 HTTP JSON。错误体是 `{ error: { code, message } }`。`BUSY` 为 409。

断线后重新连接，不在传输层补事件。打开着的那条用历史对齐，再接上之后的实时事件。目录在重连后重新拉列表，校正 `status`。

## 目录与项目登记

侧栏先拉 `GET /api/projects?offset=0&limit=20`，并另请求 `GET /api/workspace` 拿到默认工作区。前端把默认工作区固定在第一行，名字用接口返回的 `name`（目录名）；已登记的同一 `cwd` 不重复。项目没有收起记录时默认展开，并拉 `GET /api/sessions?cwd=`，同样每次 20 条；收起的不请求。收起名单在 `useLocalStore` 的 `projectsCollapsed`，并写入 `localStorage` 的 `relax`（见 [web.md](web.md) 的「持久化」，查阅时机：改侧栏展开或面板宽度的记住方式时）。项目列表底部、以及每个项目的会话底部，在还没拿完 `total` 时各有一个「更多」。收起不重新请求。新建会话会把还没有项目行的 cwd 补进项目表。已软删除的目录不会因此回来。更早留下、又从未登记的目录，要再在那里新建一条会话，或走登记接口，才会出现。登记入口是项目标题右侧的文件夹按钮：居中输入框，用户自己粘贴绝对路径，提交 `POST /api/projects`。目录不存在等 400 留在弹框里。`409` 则用已登记的那一行。

项目登记在服务端 `GET /api/projects`（见 [server-implemented.md](server-implemented.md)，查阅时机：接侧栏项目列表时）。未指定工作区时的目录是 `~/.relax/workspace`（随服务端 `home` 换走，见 [server.md](server.md)）。多根工作区不做。

新建对话只是空草稿，出现在目标项目会话列的最前，标题为「新对话」，状态点用现有的 `normal`（`--fg-disabled`）。目标是当前选中会话所在的项目；没有选中则用默认工作区。每个项目最多一条，再点只是选中。选中草稿会清掉当前真实会话，不拉历史。刷新即丢。第一次发送才 `POST /api/sessions`。不先造空会话文件。

删除走 `DELETE /api/sessions/:id`。改名走 `POST /api/sessions/:id/name`，空字符串清空标题，界面回到 `firstMessage`。

## 打开历史

选中已有会话时拉 history。Worker 译成一份快照（或译成现有 runtime 能 `replace` 的已完成消息）。主线程 `replace` 一次。此阶段不发送。

正在生成的会话也可以打开：先落地历史，再把短队列里积下的事件放进 runtime，然后接上这条的实时事件。热会话的 history 在文件上下文后面附上还没落盘的那条（`streamingMessage`）；同一条引用，或相同角色和时间戳，不重复附。客户端另留着每条会话最近一次助手 `message_update`：历史画完、放行实时事件之前，若这份半截还没出现在 history 里，先用它补上。之后的正文或思考增量若带了截至目前的全文，没有对应的开头也能把块补上。历史响应到达时，若正文里已经有消息，响应前积下的增量丢掉（那些字已经在这份 history 里），只重放响应到手之后、画上屏之前的新事件。history 还是空的则整段重放。服务端没有事件序号，响应发出后、浏览器收到前的极短一段仍可能缺字，再打开会用 history 对齐。

## 发送与中止

`Composer` 的 `onSubmit` 接到会话。没有 sessionId 时走创建并发送；已有则走续发。当前会话的 SSE 经 adapter 进入 `runtime.apply`。

通知仍是一帧一次。流式 Markdown 按 `defaultFeed` 交前缀，结束立刻画最终文本。快照只换正在写的那一块。

同一条正在生成时，再发的文字留在前端队列，不调用 `streamingBehavior`。当前回复结束（含停止）后，按顺序把队首当作普通消息发出去，成功才从队列拿走。停止不删这个队列。队列里悬停可「取消」或「立刻发送」。立刻发送会先中止当前回复，再发那一条；这次中止不会把队首也自动发出去。取消只从队列去掉这一条。服务端的 `steer` / `followUp` 仍在接口上，输入框不再使用。

中止走 `POST /api/sessions/:id/abort`。策略由服务端 `abortPolicy` 决定，前端不在本地猜服务端队列清没清，以响应为准。前端这条队列不受该策略影响。

## 后台会话

非当前会话的事件只更新目录。切到一条正在跑的会话时，走「打开历史」：先历史，再接实时。不在后台把全文收进 React。

## 后续块

模型与思考档位读已有的 `/api/models` 和 thinking-levels。新建用全局默认。续发带上所选模型，且与该会话上次不同时，才由服务端写入会话。对话框里只改默认、不发送，不改这条会话的上次模型。这块不改块模型。

工具调用是 `tool` 块，和连续的思考收成「探索」。助手错误在输入框上方，不进块。见模块 7。协议仍是 `AgentSessionEvent`，不另造事件。

## 明确不做

这些不在下面的模块里：分支 / fork、附件、checkpoint、命令审批、自动标题、文件与终端从 mock 换成真接口（仍看 [web-extension.md](web-extension.md)，查阅时机：接真实文件系统或 PTY 时）、对话列虚拟列表、把 token 流或 `Streamdown` 组件搬进 Worker。解析进 Worker 只是「发布与绘制」里的测量后门，不单独立项。

## 模块

每块可以单独做完。后一块用前一块的数据形状，不依赖后一块的界面。

### 1. 传输

依赖：服务端已有的 `/api` 与全局 SSE。

验收：页面能拉列表、能保持一条 SSE，断线重连后目录状态与一条打开中的会话能靠历史对上。侧栏项目列表来自真实接口。尚无发送。

此块不做：改 runtime、解析 Markdown、删除、改名、新建项目、新对话草稿。对话 mock、文件和终端 mock 仍留着。

当前实现：接口根在 `app/web` 的 `.env.development`、`.env.test`、`.env.production`（都先是 `http://localhost:3001`），只由 `src/config/index.ts` 读出。JSON 走 axios，超时 5 分钟写在 config 里。SSE 用 `@microsoft/fetch-event-source`，不套这个超时。`src/api/sessions`、`src/api/projects`、`src/api/sse` 各自有 `index.ts`（请求）和 `types.ts`（线上形状）。有字段变换时另放 `service.ts`：SSE 信封解析在 `api/sse/service.ts`，列表行收成目录在 `src/session/service.ts`。目录在 `src/store/catalog.ts`，项目和每个目录的会话都按 20 条分页。打开的会话、历史阶段和 `SessionContext` 在 `src/session/connect.ts`，不进目录 store。事件类型用 `import type` 引用 `@earendil-works/pi-coding-agent`。各会话的行首（进行中、没看过的成功或失败）在模块 5。帧合并、Markdown 节流和历史 Worker 留给模块 3、模块 4。

### 2. 目录

依赖：模块 1。项目分页、固定的默认工作区，以及展开后按目录分页的会话，已经在模块 1。

验收：可以登记一个目录。点「新对话」得到空草稿，刷新前不出现新的会话文件。点选已有会话已经在模块 1，只高亮并拉历史，不画正文。

此块不做：打开历史后的正文、发送、删除、改名。

当前实现：草稿在 `useCatalogStore` 的 `drafts`，不进 `sessionPages`，不写 `localStorage`。侧栏「新对话」走 `openDraftForCurrentProject`，项目行 `+` 走 `openProjectDraft(cwd)`。选中草稿调用 `clearOpenSession`，不发 history 请求。添加工作目录是 `AddProjectDialog`，只收绝对路径。登记成功后重拉第一页（新行 `position` 最大，排在默认工作区下面）；列表没刷新成功时把返回的项目插到已加载列表最前。同一 `cwd` 再登记得到 `409`，向后翻页直到那一行出现，不另插一行。默认工作区仍固定第一行，不进项目表。

### 3. 打开历史

依赖：模块 1、模块 2 的「选中哪一条」。

验收：点一条已有会话，正文来自 history，经 Worker 译一次再 `replace`。切走再打开，内容与文件一致。此块不能发送。

此块不做：流式节流、结构共享改造。

当前实现：`historyToMessages` 把 `SessionContext.messages` 收成 `CompletedMessage[]`，`Conversation` 在历史 `ready` 后 `replace` 一次，再放行这条会话的实时事件。有字符串 `id` 用它，否则用 `t` 加 `timestamp`，都没有才用 `m` 加输入下标。user 的字符串和 `text` 拼成一段；`image` 这一版不进文本块，后面单独做。assistant 保留 `thinking`、`text` 和 `toolCall`，`contentIndex` 用内容数组里的原下标；`toolResult` 按 `toolCallId` 写回那次调用。`errorMessage` 不进正文，显示在输入框上方。`system` 跳过。工具和探索组见模块 7。Worker 在 `conversation/history.worker.ts`，建不起来或译失败就在主线程跑同一函数。代际对不上的结果丢掉。`loading` 清空列，并在列内左右居中显示「加载中...」，`error` 显示「历史加载失败」，草稿和未选中是空列。对话区 mock 已删除。

### 4. 发送与中止

依赖：模块 3 的 runtime 替换路径；空草稿来自模块 2。

验收：发送后看到流式正文。生成中的 Markdown 约 30fps 更新，结束立刻是最终文本。完成的块不再跟着重解析。未闭合代码块不高亮。生成中再发进入前端队列，回复结束后按顺序自动发。停止只停当前回复，队列还在，停完队首会接着发。中止后目录变为 `idle`，正文停在已收到的内容。快照更新不复制整份块表。

此块不做：后台会话的全文、模型选择器、工具块 UI。

当前实现：`Composer` 在没有打开的会话时 `POST /api/sessions`（带草稿或默认工作区的 `cwd`），有会话则 `POST /api/sessions/:id/prompt`。创建返回前先按 sessionId 留下事件，选中后再放进短队列。202 后把会话插到该目录列表最前，标题先用刚发送的那句，并清掉草稿。忙时输入框仍可用。生成中再发不请求接口，按会话 id 留在 `src/session/pendingQueue.ts` 的内存队列里，刷新即丢，切走再回来还在。回复结束（含停止）后把队首按普通续发发出去，成功才删掉。输入框上方的「消息队列」浮层里，立刻发送会先中止，并且这次中止不顺带发出队首，只发点中的那一条；取消只删这一条。输入为空时圆按钮走 `POST /api/sessions/:id/abort`，有字时仍是发送。发送和中止的响应也会把这一行写成 `running` / `idle`。其它会话的行首在模块 5。`adaptAgentSession` 把 `thinking_*` / `text_*`、工具和用户 `message_end` 译成 `BlockFeedEvent`，压缩丢掉。工具怎么画见模块 7。`replace` 之后才 `apply`。delta 不换 `order` / 分组引用，只换正在写的那一块。开着的块按 `defaultFeed` 把前缀交给 Markdown，流式期挂代码外壳、不算 Mermaid；`complete` 的那一帧用最终文本并恢复 Mermaid。`run_end` 把还开着的块收成 `complete`。

### 5. 后台状态

依赖：模块 1 的分流、模块 4 的当前会话。

验收：A 在生成时看 B，A 的侧栏状态仍会变成 `running` / `idle`，B 的正文不重绘。再点回 A，先看到历史，再接上尚未画完的增量。

此块不做：为后台会话预解析 Markdown。

当前实现：每条 SSE 都走 `noteCatalogEvent`。`agent_start` / `agent_settled` 把已加载的那一行写成 `running` / `idle`，用户 `message_end`（以及带用户消息的 `entry_appended`）改 `modified`，`session_info_changed` 改标题。正文仍只进当前打开的会话。`willRetry` 的 `agent_end` 先不记结果；不再重试的那次，最后一条助手消息 `stopReason` 为 `error` 或 `aborted` 算失败，其余算成功。只有结束时这条不是正在看的会话，才把结果放进 `unseenRuns`（不进目录 `status`，刷新即丢）。点进这条就清掉。进行中是行首 3×3 点阵，盖过成功或失败；新对话仍是灰点；普通会话没有点。热会话历史附上 `streamingMessage`；切回来时若 history 里还没有半截，用客户端留着的最近一次助手 `message_update` 先补上。见上文「打开历史」。

### 6. 模型与思考档位

依赖：模块 4 的发送请求能带上可选字段。

验收：能看到可用模型和该模型的思考档位。新建用全局默认。续发改了模型且与该会话上次不同，服务端才写入。只改默认、不发送，这条会话的上次模型不变。

此块不做：新的块类型。

当前实现：输入框底栏右侧、发送钮左边是一个 `ghost` 按钮，文案是模型名加思考档位。点开用 `Dropdown`：一行「思考强度」，子菜单是该模型的 `thinkingLevels`，原文显示；一行「模型」，按 provider 分组，顶部可搜索。没有可用模型时按钮禁用。没打开会话时显示全局默认，改选走 `PUT /api/models/default`。打开会话且还没有本地覆盖时，显示 history 里的模型和 `thinkingLevel`；改模型走 `POST /api/sessions/:id/model`，只写全局默认，不改这条会话的上次模型。换会话或回到草稿会丢掉覆盖。新模型不支持当前档位时，落到接口给的 `defaultThinkingLevel`，再不成就列表第一项。创建和续发都带上当时的 `provider`、`model`、`thinkingLevel`。队列仍只存文本，自动发出和立刻发送在请求时读当前选择。切换失败把选择弹回去，错误显示在输入框下。设置页的模型分类仍是占位。

### 7. 工具与错误

依赖：模块 4 的 adapter 已经在收 `AgentSessionEvent`。

验收：一次工具调用是一块 `tool`，`data` 是名字、参数、结果和 `isError`，不收成 `{ text: string }`。连续的思考和工具从第一块起收进「探索」，标题固定为「探索」；两块及以上且有工具时旁边写个数。下面一行活动表示当前在做什么，还不知道下一步时是「正在规划下一步行动」。结束后活动行消失，只剩一块时不再包「探索」。助手 `errorMessage` 不进对话列，显示在输入框上方。

此块不做：命令审批、文件回滚、按工具名定制展开内容、工具结果里的图片。

当前实现：`adaptAgentSession` 把 `toolcall_*` 和 `tool_execution_*` 译成工具事件，`toolResult` 的 `message_end` 再写一次结果。参数还在流、或工具还在跑时块是 `open`，结果落地或 `run_end` 后是 `complete`。还没有 `toolCallId` 时块 key 用内容下标，结束时换成 id，不另起一行。结果更新只换这一块。历史里的 `toolCall` 进 `historyToMessages`，后面的 `toolResult` 按 id 合并；对不上的结果单独一块。助手失败不进 runtime：`assistantErrorFromEvent` 和 `historyAssistantError` 把最新一条助手 `errorMessage` 放到输入框上方，再次发送、换会话，或后面一条助手消息正常结束就清掉。工具自己的 `isError` 留在该工具块里。渲染分组在 `conversation/explore.ts`，外壳规则在 `conversation/exploreChrome.ts`。正式页 `ConversationView` 和 `/chat` 的 `ChatView` 共用 `ExploreGroup` / `ActivityLine`，不从 `chat` 互相引用；试验页的行仍用自己的 `ChatMarkdown` 和 `feed`。输入框上的失败文案是 `components/AssistantErrorNotice.tsx`：浮在锚点上方，宽与锚点相同，背景和边框用 Popover 默认。关闭、点外面或 Esc 清掉这条错误。正式页锚在 `Composer` 上，`/chat` 锚在输入框上。发送失败仍在输入框下面，不走这块。
