# 对话区渲染架构

查阅时机：改对话列表、块类型、贴底滚动、打字机、接历史或实时 `AgentSessionEvent` 时。布局 / token / 四区 shell 仍看 [`web.md`](web.md)。UI 组件(用什么 / 别造轮子)见 [`docs/ui.md`](ui.md);原子组件 API / 视觉细节见 [`web.md` §UI 组件库](web.md#ui-组件库ui)。会话列表、发送、全局 SSE、历史对齐，以及帧通知 / Markdown 节流 / Worker 的边界见 [`web-app.md`](web-app.md)（查阅时机：接服务端会话时）。本文的「明确不做」是渲染层当前不做的事；接入顺序在那篇里。

## 分层

```
history JSON → historyToMessages（Worker，失败则主线程） → runtime.replace
AgentSessionEvent → adaptAgentSession → BlockFeedEvent → runtime.apply
                              │
                              ▼
                   createBlockRuntime()     ← app/web/src/conversation/
                              │
                              ▼
                   ConversationSnapshot
                              │
                   Conversation（持有 runtime，历史 ready 后 replace）
                              │
                              ▼
                   ConversationView          ← 只认 snapshot，不 new runtime
                              │
                   layoutTurns：连续的思考和工具收成探索
                              │
                   renderBlock registry[BlockKind]
                              │
                   User / Explore / Thinking / Tool / Assistant
                              │
                              ▼
                   ui/（MarkdownView, TypewriterText, DisclosureRow, MessageSurface）
```

| 层 | 路径 | 职责 |
|---|---|---|
| 数据层 | [`app/web/src/conversation/`](../app/web/src/conversation/) | `BlockFeedEvent`、判别联合 `BlockSnapshot`、`createBlockRuntime`、`historyToMessages`、`runPhase` |
| 组装 | [`Conversation.tsx`](../app/web/src/components/conversation/Conversation.tsx) | 持有 runtime、订 snapshot、历史 `ready` 后 `replace` 一次 |
| 渲染 | [`components/conversation/`](../app/web/src/components/conversation/) | 按回合把连续的思考和工具收成探索，再按 `BlockKind` 画行。`/chat` 的行在 `chat/ChatView.tsx` |
| 观感 | [`ui/`](../app/web/src/ui/) | 无 user/thinking 词 |

渲染层禁止在 View 里 `createBlockRuntime()`。

## 数据模型

`BlockSnapshot` 按 `kind: BlockKind` 判别。`user-text` / `thinking` / `text` 的 `data` 是 `{ text: string }`。`tool` 的 `data` 是名字、参数文本、结果文本和 `isError`。类型按 kind 分开。助手错误不是块。

块上只保留 `contentPhase` + `data`。已删除 `executionPhase` / `revealPhase` / `snapshotOf`。打字机播放是 Thinking 组件的局部 UI 状态，不回写 runtime。

`ConversationSnapshot`：

- `order` / `byKey`：扁 block 列表（仍用于渲染每一块）
- `messageOrder` / `messages`：按 `messageId` 分组（复制 / 重试 / 间距的前置；按钮未做）
- `runPhase`：会话级 `'idle' \| 'running' \| 'awaiting' \| 'complete' \| 'error'`
- `revision`：每次 emit +1（贴底不再依赖它，列滚动交给 `use-stick-to-bottom`）

还没有任何助手块时活动行是「正在规划下一步行动」（`showAwaiting`），不嗅探「最后一块是 complete 的 thinking」。

## Runtime

`createBlockRuntime()`：`apply` / `replace` / `subscribe` / `getSnapshot`。

- `applyOne` 对 `BlockFeedEvent.type` 穷尽 `switch`；未知事件在类型上是 `never`，运行时丢弃。
- 不按 `startsWith('thinking')` 猜 kind。
- `_delta` 合并到 animation frame，其余立即 flush。
- `run_start` → `awaiting`；思考/正文 `start`/`delta` → `running`；对应 `end` 且 run 仍在进行 → `awaiting`；`run_end` → `complete`；`run_error` → `error`；`replace` → `idle`。

## 扩展一块

1. `BlockKind` 与 `BlockSnapshot` 加成员（自有 `data`）。
2. 若有新事件：`BlockFeedEvent` + `applyOne` 分支。
3. `renderBlock.tsx` 的 `registry: { [K in BlockKind]: ... }` 补渲染器；暂时没 UI 可先指向 `GenericBlock`。
4. 不要把所有块的 `data` 收成 `{ text: string }`。

## 滚动与流式出现

- 对话列贴底：[`use-stick-to-bottom`](https://www.npmjs.com/package/use-stick-to-bottom) 的 `StickToBottom`（在 `Conversation.tsx`）。滚动容器是 `container-type: size`。每一轮一层，最后一轮（用户消息到列表末尾，含后面的回复和活动行）`min-height: 100cqh`。短回复时贴底把这层顶对齐视口顶，回复在上半、下面留白。这层有 `padding-bottom: 40cqh`（算在 `min-height` 里）：回复超过一屏后，滚到底时末尾停在视口大约往上四成的位置，下面仍是空白，不贴输入框。没有用户消息时不包这层。初次载入、打开历史、流式增高用 `instant`。只在消息条数加一且末尾是用户消息时，`resize` / `initial` 用弹簧（`damping` 0.85、`stiffness` 0.04、`mass` 1.2），把这一轮顶上去，约 800ms 后恢复 `instant`（库里这次弹簧只保留 350ms，提前改回会把没滚完的距离瞬间补上）。用户上滑暂停、滚回底部恢复；发送时若已经不在底部，`scrollToBottom('instant')` 先拉回当前底部。不上虚拟列表。贴底时滚动视口底边有一条 `h-20`（80px）的渐隐，绝对定位、不占高度，从透明收到 `--app`，字滚过底边时变淡。空态输入框居中时没有这层。
- 每一轮（一条用户消息和它后面的回复）单独一层。用户消息在这一层里 `sticky top-0`，气泡实底、宽度 100%，滚到贴顶吸住，背后的正文不会从气泡上方露出来；下一轮滚到顶时这一层结束，前一条被顶走。助手消息不吸。
- 流式正文只做透明度：`fadeIn`（0→1，200ms，`ease-out`），没有位移。交给 streamdown 的是 `defaultFeed` 切出的前缀，不是已收到的全文；`stagger: 0`，这一拍新到的字一起淡入。已经画在屏幕上的块（历史、切回来、默认收起的思考）不重播。流结束立刻显示最终文本，淡入停。眼前流过的块结束后仍走分块 DOM。代码块内部滚动由 `isAnimating` + `MarkdownView` 外壳 `max-height: 400px` 处理。`pre` 里的字 streamdown 不包淡入，只是出现。
- [`TypewriterText`](../app/web/src/ui/TypewriterText.tsx)：grapheme 按前缀增量缓存；只在 `playing` 且未追上时 rAF；追上停帧。`playing={open && streaming}`，折叠时不跑。不再用于助手正文。

## 历史与实时

打开会话：`SessionContext.messages`（热会话已含还没落盘的那条）→ `historyToMessages`（Worker，失败则主线程）→ `runtime.replace`。若客户端还留着最近一次助手 `message_update`，且 history 里没有这条，`replace` 之后先补上，再 `apply` 实时事件。放行后目录仍是 running、runtime 却是 idle 时调用 `resumeLive`：末尾没结果的块重新打开，已有结果的工具保持结束。正文或思考增量带了截至目前的全文时，缺块也按全文建出来。消息有字符串 `id` 用它，否则用 `t` 加 `timestamp`。用户消息里的 `image` 这一版不进文本块，后面单独做块。`toolCall` 成为 `tool` 块，随后的 `toolResult` 按 `toolCallId` 写回；`system` 跳过。助手 `errorMessage` 不进列，显示在输入框上方。见 [`web-app.md`](web-app.md) 模块 7。

实时：`AgentSessionEvent` → [`adaptAgentSession.ts`](../app/web/src/conversation/adaptAgentSession.ts) → `BlockFeedEvent` → `runtime.apply`。`agent_end` 不把这一轮收成结束，要等 `agent_settled`。

## 打磨 UI

数据层（`src/conversation/`）不要为观感加字段。改外观按层下手：

| 要改的 | 改哪里 | 不要改 |
|---|---|---|
| Markdown 排版、代码块、流式样式 | `ui/MarkdownView/`（见 [`docs/ui.md`](ui.md#markdownview)） | runtime / snapshot |
| 思考块 Markdown 化(流式 / 静态) | `ThinkingMessage.tsx`(调用 `MarkdownView`,`mode` / `isAnimating` 跟随 `streaming` + `open`) | 不要让 `MarkdownView` 知道 user / assistant |
| 高度过渡容器 | `ui/Expandable.tsx`(见 [`ui.md#expandable`](ui.md#expandable)) | 不要为单处使用装 `framer-motion` 的 `AnimatePresence` |
| 折叠行 + chevron + 标题扫光 | `ui/DisclosureRow.tsx` + `ui/ShinyText.tsx`(见 [`ui.md#disclosurerow`](ui.md#disclosurerow) / [`#shinytext`](ui.md#shinytext)) | 思考策略文案(仍在 `ThinkingMessage`);不要把开合状态塞进 snapshot |
| 用户气泡外壳 | `ui/MessageSurface/`(见 [`ui.md#messagesurface`](ui.md#messagesurface),无角色词)+ `UserMessage.tsx` 的对齐/间距 | 不要在 Surface 上加 user/assistant 语义 |
| 思考行交互与默认开合 | `ThinkingMessage.tsx` | 不要把开合状态塞进 snapshot |
| 列表间距、探索分组、活动行 | `ConversationView.tsx`（外壳在同目录的 `ExploreGroup.tsx` / `ActivityLine.tsx`；`/chat` 的行仍在 `chat/ChatView.tsx`） | 两边共用活动行，不再画「生成中」。贴底在 `Conversation.tsx` 的 `StickToBottom` |
| 色/字号/圆角 token | `src/index.css` + [`design-system.md`](design-system.md) | 不要在块组件里写死 hex |

> 任何 ui 组件的「何时用 / 何时不用 / API」,查 [`docs/ui.md`](ui.md);不在本表重复。

消息间距（`/chat` 的 `chat/ChatView.tsx` 和正式页 `components/conversation/ConversationView.tsx` 同一套）：用户消息与其它块之间 20px（容器 `gap-5` + 用户段 `mb-2.5`），助手回复内部相邻块 10px（`gap-2.5`），末块到活动行也是 10px，回合之间 20px。`ExploreGroup` 组内行距仍 2px，不动共享组件。

思考块：默认收起；历史与流式都可展开/收起；标题固定为「思考」，流式时仍走 `ShinyText`(由 `DisclosureRow.blinking` 控制);`isAnimating={open && streaming}`。正文用 `markdown-view--dim`（`--fg-disabled` 混 28% `--fg-3`，比纯禁用色略亮，仍暗于「思考」标题）。箭头 `chevron="hover"`：收起时只有悬停才显示，展开后常显；再收起且指针不在行上时立刻消失。连续的思考和工具在回合里收成一组「探索」（`conversation/explore.ts`），默认收起；展开后里面仍是思考行和每个工具行，工具这一版同样可展开，参数是纯文本，结果走 Markdown，`isError` 用 `text-error`。正式页和 `/chat` 共用探索外壳（`components/conversation/ExploreGroup.tsx`、`ActivityLine.tsx`，规则在 `conversation/exploreChrome.ts`）。从第一块起就放进「探索」，标题固定为「探索」；两块及以上且工具数大于 0 时旁边写「N 个工具」。下面另有一行当前活动，与上一块的间距和块间距相同，替换「生成中」：还没有任何块、或当前块已经结束但下一步还不明时，是「正在规划下一步行动」；正在进行的那一块才显示「思考」或工具名，点它展开上面那组并滚到对应行。探索组展开时，外面不再重复组里正在进行的那一行。这一轮结束后活动行消失；只剩一块时不再包「探索」。正式页的行是 `ThinkingMessage` / `ToolMessage`，`/chat` 的行仍是 `ChatView` 自己的。`Composer` 的发送接到 `sendConversation`：没有会话就创建，已有则续发。生成中输入为空时圆按钮是停止；有字再发只进前端队列，当前回复结束后按顺序自动发。队列里的立刻发送会先停掉当前回复再发那一条，取消只删掉这一条。

## 明确不做

- 虚拟列表
- 复制 / 重试按钮（分组已在 snapshot 里）
- 按工具名定制展开内容、命令审批、文件回滚。用户消息和工具结果里的图片这一版不进文本，后面单独做块。助手错误不进对话列，显示在输入框上的 `AssistantErrorNotice`
- 把 `revealPhase` 接回 runtime
- 把 `src/conversation/` 数据层并进 `components/conversation/`（与 UI 分目录；职责见上文分层）
