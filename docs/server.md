# app/server 整体规划

查阅时机：改 `app/server`、定数据目录、接 pi 会话、文件同步或终端之前。某一块开工时以本文的能力剖面和性能上限为底。路径、接口、目录里实际有哪些文件，实现时写进本文，并和代码一起改。代码和本文不一致时，以改代码的同一次修改把本文补齐，不另开一轮补文档。

本文是底座。对话模块已接：会话文件、智能体类、路由与全局 SSE。前端（`app/web`）本轮不接，适配器以后再写。

对接 pi 之前先读源码，不要只凭本文的 API 摘要选函数。本地克隆在仓库根的 `pi/`（已 git 忽略），会话相关源码在 `pi/packages/coding-agent/src/core/`，说明在 `pi/packages/coding-agent/docs/sdk.md`。运行时安装的是 `@earendil-works/pi-coding-agent@^1.0.4`（与 `pi-ai` 同版本）。类型或文档和源码不一致时，以源码为准，并把结论回写本文。

相关文档：当前已经实现的能力清单见 [server-implemented.md](server-implemented.md)（查阅时机：想看服务端现在做到哪、对照联调页时）。对话区现有块模型见 [web-conversation.md](web-conversation.md)（查阅时机：把服务端事件译成现有 UI 时）。文件与终端的前端契约见 [web-extension.md](web-extension.md)（查阅时机：做文件系统或 PTY 时）。`app/agenttest` 只是加载试验，不能当作已验证结论。

## 产品形态

本地单用户服务，形态接近 Cursor / Codex 桌面端：一个 OS 用户、一个进程、多个项目、每个项目多条会话。不选项目也能聊，落在默认工作区。

登录和多用户以后可能会做，当前不做。用户名和头像只做本地展示，不进鉴权，优先级最低。

进程内嵌 pi，不用 `pi --mode rpc`。产品要的是多个工作目录、多条会话同时打开或生成。`createAgentSession` 只创建一条 `AgentSession`。列表和打开文件用 `SessionManager`。`createAgentSessionRuntime` 是 CLI / RPC 那条「进程里只有当前这一条」：`switchSession` 会中止并 `dispose` 旧会话。稳定 SDK 没有多会话管理器，所以我们自己的智能体类按 sessionId 各握一份 `AgentSession`（工厂里会调一次 `createAgentSessionRuntime`，创建完只留 `.session`，不用它的切换 API）。实验性的 `SessionWorkerManager` 是每条会话一个子进程，不在稳定导出里，当前不用。

运行时跟 pi 对齐：Node >= 22.19。实现时只改 server 包的 `engines`。继续用现有 Express，端口 `3001`，由 `pnpm dev:server` 拉起，不另占端口。测试用 Node 自带 `node:test`，每个 HTTP 路由和每条 WebSocket 协议都有用例。调用模型的测试不打真实 API。

## 数据

### pi 对照

pi 的家目录是 `~/.pi`（`configDir`）。coding-agent 的数据根是 `~/.pi/agent`（`getAgentDir()`，`PI_CODING_AGENT_DIR` 可换走）。旁边还有 `~/.pi/server`，和会话无关。项目内配置是 `<cwd>/.pi/`，不再套 `agent`。

`~/.pi/agent/` 里常见内容：`auth.json`、`models.json`、`models-store.json`、`settings.json`、`trust.json`、`keybindings.json`、`pi-debug.log`、可选的 `AGENTS.md` / `SYSTEM.md`；目录 `sessions/`、`skills/`、`extensions/`、`prompts/`、`themes/`、`tools/`、`bin/`、`npm/`、`git/`、`tmp/`。

会话文件：

```text
~/.pi/agent/sessions/--<cwd 编码>--/<时间戳>_<sessionId>.jsonl
```

编码：去掉路径开头的 `/`，把 `/`、`\`、`:` 换成 `-`，两侧加 `--`。cwd 是工作区目录，写在 JSONL 头里。项目靠这一层子目录分桶，文件名只区分同一工作区里的某一条会话。一条会话一个 jsonl，继续聊是追加。JSONL 头 `version` 为 3。`SessionManager.create` / `newSession` 只分配 id 和路径，此时还没有文件。第一条 **user** 消息发出时写出文件（pi 0.99 起；此前等第一条 assistant）。没有「空会话文件」。SessionManager 是后续请求上下文的权威来源，不要改 `session.agent.state.messages` 当历史。

pi 没有会话索引。`list(cwd)` 扫该编码目录下的 `*.jsonl`，`listAll()` 扫 `sessions/` 下每个子目录。两次都是当场全量读文件。同时读的并发是 10，不是条数上限。文件会一直增加，列表会越来越慢。当前照扫，不加索引；以后加索引不改 JSONL 布局。

### 我们的根

默认 `~/.relax`，环境变量 `RELAX_HOME` 可整棵换走。传给 pi 的 `agentDir` 是 `~/.relax/agent`。进程里把 `PI_CODING_AGENT_DIR` 设成这个路径，这样 `SessionManager.list` / `listAll` 不会落到 `~/.pi/agent`。

```text
~/.relax/agent/sessions/--<cwd 编码>--/<时间戳>_<sessionId>.jsonl
```

未指定工作区时 cwd 为 `~/.relax/workspace`（随 `RELAX_HOME` 换走）。本轮不读技能、扩展、提示词、主题、上下文文件。不写索引文件。

三条原则：

- 路径可配置，默认值落在 `.relax`，不写进 `~/.pi`
- 会话正文用 pi 的 JSONL，不另发明一套消息存档
- 项目本体是用户选的文件夹，`.relax` 不复制项目

添加项目等于登记一个已有文件夹。一个项目一个根目录。多根工作区不做。

## SDK 入口

稳定包只有 `@earendil-works/pi-coding-agent` 的主入口。`./rpc-entry` 给子进程 RPC。`./client` 和 `./experimental/plugin` 不在发布产物里，当前规划不依赖它们。

按使用场景：

- **一条对话**。`createAgentSession` 造出 `AgentSession`：`prompt` 发送，`subscribe` 收事件，`abort` 中止，`dispose` 释放。`steer` / `followUp` 是生成过程中插队。`compact` 是手动压缩。`navigateTree` 是同一份 JSONL 里换分支。
- **会话文件**。`SessionManager` 管 JSONL，不跑模型。`create` 新建，`open` 打开路径，`continueRecent` 续最近一条，`inMemory` 不落盘，`list` / `listAll` 列目录，`forkFrom` 从旧文件分出新文件。
- **切换当前这一条**。`createAgentSessionRuntime` 得到 `AgentSessionRuntime`，里面始终只有 `runtime.session`。`newSession`、`switchSession`、`fork`、`importFromJsonl` 会先中止并 `dispose` 旧会话，再换上新的。订阅绑在旧对象上，换完要重新 `subscribe`。
- **模型**。`ModelRuntime.create` 管密钥、`models.json` 和供应商。当前只接 MiniMax，仍走这个入口。
- **提示词、技能、规则、扩展从哪读**。`DefaultResourceLoader`，或自己实现 `ResourceLoader` 传进 `createAgentSession`。`loadSkills` / `loadSkillsFromDir` 是单独扫技能目录。
- **工具**。`createAgentSession` 的 `tools` / `noTools` / `customTools` 控制启用哪些。`createReadTool`、`createCodingTools` 等工厂是要换工作目录或换文件操作实现时用的。
- **设置**。`SettingsManager` 读 pi 的 `settings.json`。我们要可控的项优先走自己的 `.relax` 和 loader，不默默吃 `~/.pi`。
- **整段 CLI**。`main`、`runPrintMode`、`runRpcMode`、`InteractiveMode`、`RpcClient` 是终端和子进程模式。嵌入服务不用这些。

`AgentSession` 上没有「切到另一条会话」。那是 `AgentSessionRuntime` 的事，而且切换意味着旧的那条不再处于活动状态。

## 自定义

pi 暴露的加载点都要能指定到 `.relax` 或配置里的路径，不默默读 `~/.pi`，也不默默向上搜文件。包括：系统提示词、技能目录、规则和上下文文件、会话存放、`agentDir`、工具列表。

`app/agenttest` 里对各类 override 的尝试只是草草看过。做到提示词、技能、规则时，对着当时的 pi 源码做一次最小复现，再把结论写进本文：哪一个 override 会换掉整段提示、工具说明还在不在、技能路径实际读哪些。

当前只定范围：

- 系统提示词、技能、规则、扩展都要可控。默认路径等那一块开工再定。扩展能执行代码，默认关掉，显式打开再加载。
- 工具用 pi 的内置白名单，范围锁在该会话的项目根或默认工作区。默认开哪几个，做到工具那一块再定。
- 模型当前只接 MiniMax。密钥用 `MINIMAX_API_KEY`（启动时已有的环境变量优先，否则读 `app/server/.env`），或写在 `.relax` 里由我们指定的 auth 文件。选型走 pi 的 `ModelRuntime`。以后加提供商只加配置，不改会话和事件通路。
- 上下文压缩沿用 pi 的自动行为，不单独做接口。它是上下文体积的安全阀。
- 分支、fork、从某一条消息重开是高级能力。JSONL 里的树先留着，当前不设计接口。文件快照式的回滚也不做。

主题只影响 pi 的 TUI，服务端不管。

## 对话

存档和线上事件以 pi 为准：会话 JSONL，以及 `AgentSessionEvent` 里的消息和增量。服务端不另造一套事件类型。

前端现在的 `BlockFeedEvent`（只有用户文本、思考、正文）是 UI 先画出来的形状，不是长期协议。前端用薄适配器译成现有块，适配器放在 web 侧，见 [web-conversation.md](web-conversation.md)。后续界面往 pi 的消息格式靠，包括工具调用和压缩。

对话那一块：第一次发送即建会话（`create` 时不写空文件，第一条 user 消息写出）、列表、单条信息、历史（`buildSessionContext`）、删除、续发、中止、全局 SSE。列表 `status` 只有 `idle` / `running`（对齐 pi 的 `isStreaming`；自动重试仍算 running）。失败写在 messages 和 SSE 里，不另做会话态。标题用 pi 的 `name`，没有则 `firstMessage`。

工具调用、压缩、队列是 pi 事件里已有的。哪一块还没开，就在能力剖面里关掉对应能力，不把事件协议裁窄。开了之后原样转发。

### 智能体类

`app/server/src/agent/` 是唯一调用 pi 会话 API 的目录。类内部按 sessionId 缓存 `{ session: AgentSession }`，同一套工厂（内部 `createAgentSessionRuntime`，对外只返回 session）。对外 `prompt`（可无 id，可带 `thinkingLevel` 与 `streamingBehavior`）、`rename`、`abort`、`status`、`subscribe`。HTTP 和 SSE 只订这个类。档位查询读已注册模型，不经过这个类。

剖面本轮：`noTools: "all"`，loader `noSkills` / `noExtensions` / `noContextFiles` / `noPromptTemplates` / `noThemes`。模型 MiniMax（`MINIMAX_API_KEY`），`agentDir` 指向 `~/.relax/agent`。

新对话：`SessionManager.create(cwd)` 后立刻 `prompt`。文件等第一条 user 消息。思考档位默认 `medium`。正在回复时，不带 `streamingBehavior` 再 `prompt` 得 `BUSY`；`steer` 在当前回复及其工具结束后、下一次模型调用前插入，`followUp` 在本轮结束后再发。两者都不打断正在吐的字。

历史：热会话用该 `sessionManager.buildSessionContext()`，否则 `SessionManager.open` 再同样调用。返回 `{ messages, thinkingLevel, model }`，不手读 JSONL。

列表字段从 pi 的 `SessionInfo` 推导（去掉 `path`、`allMessagesText`，时间输出 ISO）。另加内存 `status`：`idle` | `running`。历史类型即 pi 的 `SessionContext`。字段含义不在本文展开，看 [api.html](../app/server/test/html/api.html) 各接口的请求类型和返回类型，或直接看 [sessions/types.ts](../app/server/src/sessions/types.ts) 与路由。查阅时机：改会话 JSON 形状时，改实现并改调试页上的类型，不必在本文再抄一份。

### 接口

`BUSY` 为 409。`GET /api/sessions/events` 写在 `/:id` 之前。请求和返回的字段以调试页为准。

- `POST /api/sessions` 第一次发送并创建，202。可选 `thinkingLevel`，不传则 `medium`
- `GET /api/sessions` 列表，默认全部工作区
- `GET /api/sessions/:id` 一条信息
- `GET /api/sessions/:id/history` `buildSessionContext()`
- `DELETE /api/sessions/:id` 中止并删除文件，204
- `POST /api/sessions/:id/prompt` 续发，202。可选 `streamingBehavior`（`steer` | `followUp`）和 `thinkingLevel`
- `POST /api/sessions/:id/name` 手动设置 `name`，空字符串清空
- `POST /api/sessions/:id/abort` 中止
- `GET /api/models/thinking-levels?provider=&id=` 查询该模型可选思考档位和默认档位 `medium`。未注册 404
- `GET /api/sessions/events` 全局 SSE，不进 api.html。`data` 为 `{ sessionId, event }`，内层是 pi 的 `AgentSessionEvent`

SSE 断线不补，客户端用历史对齐。发送和中止走 HTTP。本轮不接 `app/web`。

`name` 只来自手动设置，pi 不会在第一次发送时写成第一句话。列表仍同时返回 `name` 和 `firstMessage`，没有 `name` 时界面用 `firstMessage`。

往后放：第一次对话后用模型生成短标题写入 `name`，未生成前列表继续用 `firstMessage` 兜底。图片附件、模型选择器、编辑或重试某一条、分支树、checkpoint 回滚、命令审批。

## 能力剖面

每次只做当时点名的一小块。没做的能力不会被顺手跑起来，做了的能力有上限，超限是拒绝，不是把进程拖死。

「先只做对话、关掉技能和工具」只是切分方式的例子，不是排期。

后面的块只加不改，接缝有四条：

- **能力剖面**。每次创建 `AgentSession` 都带一份显式剖面：工具、技能、扩展、规则和上下文文件、提示词，各自是关还是一组路径。关掉必须传给 pi（如 `noTools`、`noSkills`、`noExtensions`、不扫描上下文），不能靠这段代码还没写。以后加工具或技能，只改剖面。
- **列表**。本轮无索引，走 `SessionManager.list` / `listAll` 全量扫描，并上智能体里尚未落盘的热会话。
- **会话宿主**。智能体类持有多份 `AgentSession`（多工作目录可同时生成）。事件是 `(sessionId, AgentSessionEvent)`。SDK 会话默认不加载 CLI 的 `codemode` / MCP，要用时显式挂 extension factories。
- **未做到的子系统不启动**。文件监听、PTY、技能扫描各自独立模块，对应那一块开始之前不加载、不占文件描述符。

## 性能上限

单进程里，未捕获异常、同步读大文件、无限热会话或 watcher，会波及所有会话。下面的数字是初始天花板，做到那一块时再标定。超限返回错误，不在内存里排队。

- **启动**。只监听端口并确保 `.relax` 根存在。不扫全部会话，不建模型客户端，不 watch 磁盘。
- **列表**。本轮全量扫描 JSONL（与 pi 相同）。不创建 runtime。文件多了会慢，先记下，不加索引。
- **热会话**。有订阅或正在生成才驻留。本轮不限制同时打开或同时生成的条数（pi 也没有这两条限制）。没有订阅且不在生成的会话 `dispose`，下次从 JSONL 打开。
- **单会话单飞**。同一条会话已有生成时，不带 `streamingBehavior` 拒绝第二条（`BUSY`）。`steer` / `followUp` 只排队，不另开一条生成。
- **流式**。服务端不另存一份完整正文。pi 追加 JSONL，我们转发事件。客户端读得慢就背压，缓冲有上限，满了断开这一条连接。
- **历史**。只在打开该会话时读。单文件读取有上限。上下文体积靠 pi 自带压缩兜住。
- **事件循环**。请求路径上不同步读大目录或大文件。订阅回调里的异常记到该会话，不让进程退出。中止要传到模型请求。
- **文件监听**（做到才启用）。只订已打开的那一层目录，不递归整棵仓库。防抖后再推列表。忽略 `node_modules`、`.git`、`dist`。watcher 数量有上限。
- **终端**（做到才启用）。PTY 个数有上限，回放缓冲约 100KB，关闭时必须释放文件描述符。
- **工具**（做到才启用）。先读写编辑，shell 最后开，并加超时和路径限制。在此之前剖面是无工具。
- **技能与规则**（做到才启用）。只扫剖面里的目录，不向上搜。条数和正文大小有上限，避免系统提示把上下文撑满。

## 优先级

下面是依赖顺序，不是开工清单。每次指定一块，并用剖面把其余能力关掉。

1. 进程、`.relax` 根、健康检查、单会话错误不拖垮进程
2. 项目、默认工作区、会话索引（不调用模型）
3. 对话运行时：MiniMax、流式、中止、`buildSessionContext` 历史、全局 SSE
4. 工具：读、写、编辑，然后才是 shell
5. 技能
6. 规则与系统提示词（开工前先核对 loader）
7. 文件系统读和监听
8. 终端
9. 用户名和头像

分支、fork、多提供商、附件、命令审批不在这个序列里。前端接入另行指定。

## 文件系统

`chokidar` 加 WebSocket `/ws/fs` 即可，不上 Watchman。原生 watcher 等目录规模真出问题再考虑。

对齐前端 `FsApi`：监听推的是防抖后的完整目录列表，不是 chokidar 原始事件。HTTP 先做 `list`、`stat`、`read`（文本）。`write`、`create`、`delete` 的形状可以一起定，实现放到文件那一块。忽略列表放进 `.relax` 的配置，文件名等做文件系统时再定。

所有路径先解析真实路径，必须落在该项目根或默认工作区里。`..` 和逃出根目录的符号链接拒绝。

## 终端

对齐前端 `PtyApi`：创建、写入、调整大小、关闭、订阅输出。实现用 `node-pty`，走 WebSocket `/ws/pty`。工作目录默认该项目根或默认工作区，shell 用 `SHELL`，没有则 `/bin/zsh`。

PTY 活到关闭或进程退出。断线可以再订阅，并用最近约 100KB 回放。滚动缓冲不写磁盘。服务重启后终端即没。

## 通道

一个端口。已定入口：

- `GET /health`：健康检查，不在 `/api` 下。返回 `{ "status": "ok" }`
- HTTP JSON 用 `/api` 前缀。会话见上文接口。
- 对话推送：`GET /api/sessions/events`（SSE）
- 文件变化：WebSocket `/ws/fs`。做到文件系统再实现
- 终端：WebSocket `/ws/pty`。做到终端再实现

跨域当前全部放开，响应带 `Access-Control-Allow-Origin: *`，不带 cookie。以后做登录再收紧。

错误体一律：

```json
{ "error": { "code": "NOT_FOUND", "message": "..." } }
```

骨架用 `BAD_REQUEST`、`NOT_FOUND`、`INTERNAL`。对话模块另有 `BUSY`（409）。JSON 请求体上限 1mb。

`/api`、`/ws/fs`、`/ws/pty` 是不同路径，前面加反向代理时可以按前缀分别转发。

正在用的会话在内存里对应一份 `AgentSession`。列表来自 `SessionManager` 扫描，加上尚未落盘的热会话（`create` 之后、第一条 user 消息之前）。

## 目录

按职责分目录。入口文件只负责启动，不把路由、会话、文件监听堆在 `src/index.ts`。没做到的能力不建空目录，做到那一块再加对应目录，并在这里补上实际路径。

```
app/server/src/
  index.ts              加载 .env，确保 ~/.relax/agent，监听端口
  app.ts                组装应用，测试从这里创建
  config/home.ts        RELAX_HOME、agentDir、PI_CODING_AGENT_DIR
  utils/errors.ts       错误类型与 Express 错误中间件
  utils/text.ts         消息纯文本
  utils/request.ts      请求体 text / cwd
  sessions/             列、打开、历史、删
  agent/                智能体类、Runtime 工厂、剖面
  routes/health.ts      GET /health
  routes/models.ts      GET /api/models/thinking-levels
  routes/sessions.ts    会话路由与 SSE
app/server/test/
  health.test.ts
  sessions.test.ts
  sessions-http.test.ts
  agent.test.ts
  html/
    index.html        手工测试页目录，卡片链到下面两页
    sessions.html     会话联调：进页即连 SSE
    api.html          单接口 HTTP 调试，含请求类型与返回类型
```

还没建的目录：`fs/`、`pty/`，以及 `/ws/fs`、`/ws/pty` 的处理。`agent/` 是唯一直接调用 pi 会话 API 的目录。

手工测试页在 [html/](../app/server/test/html/)，服务需已由 `pnpm dev:server` 拉起。会话相关接口互相依赖，用 [sessions.html](../app/server/test/html/sessions.html)：进入即连 `GET /api/sessions/events`，可在同一页发送、续发（含 steer / followUp）、设置思考档位、查询模型档位、设置标题、中止、列会话、看历史和删除。逐条 HTTP 仍用 [api.html](../app/server/test/html/api.html)。字段含义以该页的 `requestType` / `responseType` 为准。每新增一个 HTTP 接口，在文件顶部的 `ENDPOINTS` 追加一项并写上带字段注释的类型；接口调整时改这一处和实现，不必在本文再抄参数。查阅时机：加路由后自己点发送，或要看当前有哪些 HTTP 接口及其字段含义时。SSE 不进 api.html。

`ENDPOINTS` 每项必填 `group` / `name` / `method` / `path` / `summary` / `requestType` / `responseType`。`requestType`、`responseType` 是 TypeScript 文本，字段用行注释说明含义，调试页在「响应」后面以深色代码块展示。可填 `auth`（鉴权描述，如 `"JWT Bearer"`，不填则卡片显示「无需鉴权」）、`queryParams` / `bodyParams`（`{ name, type, required, description, example }` 数组，填了渲染参数卡并自动生成 cURL / JS 示例；`body` 是纯 JSON 字符串模板，不填且 `bodyParams` 也没填时 textarea 为空）。`path` 里的 `:name` 会自动变成可填写的路径参数，发送、顶栏路径和示例都会替换；可选 `pathParams`（形状同 `queryParams`）补充说明和示例。`queryParams` 同样有输入框：必填项用 `example` 预填，可选项留空，发送时只带已填写的项。这些字段不回传服务端，只是让调试页更接近接口文档的观感。

约定：

- 路由只调 `sessions/`、`agent/`、`fs/`、`pty/` 的函数，不在路由文件里 `import` pi 再组参数。
- 选 pi 的哪个函数，先看 `pi/packages/coding-agent/src/core/` 里该函数的实现和调用方，确认它是「创建一条」「切换当前一条」还是「只动文件」。不合理的用法不进 `agent/`。
- 新能力加新文件或新目录。一个文件变长到要同时管两件不相干的事，就拆开。
- 改行为、改路径、改上限时，同一次改动更新本文对应小节。只改代码不改本文，算这步没做完。

## 和 Cursor / Codex 的差距

多项目、多会话、不选项目也能聊，这一层对齐。流式正文、思考、中止、历史回放，pi 够用，线上格式跟 pi。工具、规则、技能目录可控，但是 loader 的具体行为要在对应那一块重新验证。模型当前只有 MiniMax。文件树用按目录订阅。终端不经过 pi。

往后放的能力：分支和 fork、附件、检查点回滚、命令审批、多根工作区。用户名和头像优先级最低。
