# app/server 整体规划

查阅时机：改 `app/server`、定数据目录、接 pi 会话、文件同步或终端之前。某一块开工时以本文的能力剖面和性能上限为底。路径、接口、目录里实际有哪些文件，实现时写进本文，并和代码一起改。代码和本文不一致时，以改代码的同一次修改把本文补齐，不另开一轮补文档。

本文是底座。对话模块已接：会话文件、智能体类、路由与全局 SSE。前端（`app/web`）本轮不接，适配器以后再写。

对接 pi 之前先读源码，不要只凭本文的 API 摘要选函数。本地克隆在仓库根的 `pi/`（已 git 忽略），会话相关源码在 `pi/packages/coding-agent/src/core/`，说明在 `pi/packages/coding-agent/docs/sdk.md`。运行时安装的是 `@earendil-works/pi-coding-agent@^1.5.0`（与 `pi-ai` 同版本）。类型或文档和源码不一致时，以源码为准，并把结论回写本文。

相关文档：当前已经实现的能力清单见 [server-implemented.md](server-implemented.md)（查阅时机：想看服务端现在做到哪、对照联调页时）。对话区现有块模型见 [web-conversation.md](web-conversation.md)（查阅时机：把服务端事件译成现有 UI 时）。前端怎么接会话、目录和 SSE 见 [web-app.md](web-app.md)（查阅时机：开始做 `app/web` 的对话与会话管理时）。文件与终端的前端契约见 [web-extension.md](web-extension.md)（查阅时机：做文件系统或 PTY 时）。`app/agenttest` 只是加载试验，不能当作已验证结论。

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

pi 没有会话索引。`list(cwd)` 扫该编码目录下的 `*.jsonl`，`listAll()` 扫 `sessions/` 下每个子目录。两次都是当场全量读文件。同时读的并发是 10，不是条数上限。文件会一直增加，这样列会越来越慢。列表不走这两次扫描，摘要在 `relax.sqlite` 的 `sessions` 表，见 [server-sqlite.md](server-sqlite.md)。JSONL 布局不改。

### 我们的根

默认 `~/.relax`。家目录写在 `app/server/config.json` 的 `home`（`~` 会展开），缺这个字段时用代码默认值。传给 pi 的 `agentDir` 是 `~/.relax/agent`。进程里把 `PI_CODING_AGENT_DIR` 设成这个路径，这样 `SessionManager.list` / `listAll` 不会落到 `~/.pi/agent`。

```text
~/.relax/agent/sessions/--<cwd 编码>--/<时间戳>_<sessionId>.jsonl
```

未指定工作区时 cwd 为 `~/.relax/workspace`（随 `config.json` 的 `home` 换走）。技能按基座默认目录加载，见「技能」。提示词、主题、上下文文件仍不读，也不扫磁盘上的扩展。显式挂 Langfuse 官方插件 `@langfuse/pi-observability-plugin` 和 `pi-web-access`。不写索引文件。

三条原则：

- 路径可配置，默认值落在 `.relax`，不写进 `~/.pi`
- 会话正文用 pi 的 JSONL，不另发明一套消息存档
- 项目本体是用户选的文件夹，`.relax` 不复制项目

添加项目等于登记一个已有文件夹。一个项目一个根目录。多根工作区不做。新建会话时，这个目录还没有项目行也会补登记；已软删除的不因此恢复。登记、顺序、软删除和会话索引在 `{home}/sqlite/relax.sqlite`，表结构见 [server-sqlite.md](server-sqlite.md)（查阅时机：改这几张表时）。会话正文仍是上面的 JSONL。

## SDK 入口

稳定包只有 `@earendil-works/pi-coding-agent` 的主入口。`./rpc-entry` 给子进程 RPC。`./client` 和 `./experimental/plugin` 不在发布产物里，当前规划不依赖它们。

按使用场景：

- **一条对话**。`createAgentSession` 造出 `AgentSession`：`prompt` 发送，`subscribe` 收事件，`abort` 中止，`dispose` 释放。`steer` / `followUp` 是生成过程中插队。`compact` 是手动压缩。`navigateTree` 是同一份 JSONL 里换分支。
- **会话文件**。`SessionManager` 管 JSONL，不跑模型。`create` 新建，`open` 打开路径，`continueRecent` 续最近一条，`inMemory` 不落盘，`list` / `listAll` 列目录，`forkFrom` 从旧文件分出新文件。
- **切换当前这一条**。`createAgentSessionRuntime` 得到 `AgentSessionRuntime`，里面始终只有 `runtime.session`。`newSession`、`switchSession`、`fork`、`importFromJsonl` 会先中止并 `dispose` 旧会话，再换上新的。订阅绑在旧对象上，换完要重新 `subscribe`。
- **模型**。`ModelRuntime.create` 管密钥、`models.json` 和供应商。白名单里的内置提供商可以填 key、选模型。自定义提供商和 OAuth 不做。
- **提示词、技能、规则、扩展从哪读**。`DefaultResourceLoader`，或自己实现 `ResourceLoader` 传进 `createAgentSession`。`loadSkills` / `loadSkillsFromDir` 是单独扫技能目录。
- **工具**。`createAgentSession` 的 `tools` / `noTools` / `customTools` 控制启用哪些。`createReadTool`、`createCodingTools` 等工厂是要换工作目录或换文件操作实现时用的。
- **设置**。`SettingsManager` 读 pi 的 `settings.json`。我们要可控的项优先走自己的 `.relax` 和 loader，不默默吃 `~/.pi`。
- **整段 CLI**。`main`、`runPrintMode`、`runRpcMode`、`InteractiveMode`、`RpcClient` 是终端和子进程模式。嵌入服务不用这些。

`AgentSession` 上没有「切到另一条会话」。那是 `AgentSessionRuntime` 的事，而且切换意味着旧的那条不再处于活动状态。

## 自定义

pi 暴露的加载点都要能指定到 `.relax` 或配置里的路径，不默默读 `~/.pi`。技能是当前的例外：用户级已经落在 `.relax`，项目级和向上搜索仍是基座默认，见「技能」。包括：系统提示词、技能目录、规则和上下文文件、会话存放、`agentDir`、工具列表。

`app/agenttest` 里对各类 override 的尝试只是草草看过。技能实际读哪些目录，结论在「技能」。提示词和规则开工前，再对着当时的 pi 源码核对 loader。

当前只定范围：

- 系统提示词、规则、扩展都要可控。技能已按基座默认目录加载，路径见「技能」。扩展能执行代码，磁盘扫描默认关掉。当前显式挂 Langfuse 官方插件和 `pi-web-access`，见下文「追踪」。找官方或社区插件时看 [https://pi.dev/packages](https://pi.dev/packages)（查阅时机：要加扩展、避免自己再写一份已有能力时）。
- 工具白名单写在会话工厂：八个内置（`read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`、`powershell`）、`codemode`，以及 `pi-web-access` 的 `web_search`、`fetch_content`、`get_search_content`、`source_check`。`tool_search` 和 `web_enable` 不开。`powershell` 在非 Windows 上调用会由基座报错。模式以后再按这份名单切换。路径仍是该会话的 cwd。
- 模型走 pi 的 `ModelRuntime`，不另建配置文件。白名单在 `app/server/src/agent/models.ts` 的 `KEY_PROVIDERS`，只收一把 key 就能对话的内置提供商（`pi-ai@1.5.0`）。升 `@earendil-works/pi-ai` 后对照 `providers/*.ts` 的 `auth` 再核一次。名单外的 id，包括 `models.json` 里自造的提供商，接口拒绝。同时带 OAuth 的只走 `api_key` 登录。密钥写入 `~/.relax/agent/auth.json`，同一 id 再提交是修改。不删除环境变量：基座认为可用就算可用，包括 `auth.json`、环境变量和该提供商会读的本机凭证。不向厂商发请求试 key。可用对话模型至少有一个、但全局还没有一对仍可用的默认时，按基座 `defaultModelPerProvider` 的顺序补写 `settings.json` 的 `defaultProvider` / `defaultModel`（该常量未从包入口导出，顺序抄在 `DEFAULT_MODEL_ORDER`）。新建会话用这一对；请求里带了 `provider` 和 `model` 时这次用它，并写成新的默认。打开旧会话仍恢复该文件自己的 `model_change`。对话框里改模型只写全局默认，不改当前会话文件。续发带了 `provider` 和 `model`、且与该会话上次记录不同时，才追加 `model_change`，不改默认。没带则继续用该会话已恢复的模型。模型目录的底表在 npm 包里；手动更新是 `POST /api/models/refresh`，转调 `refresh({ allowNetwork: true, force: true })`，结果进 `~/.relax/agent/models-store.json`。不在启动或列模型时自动刷新。
- 上下文压缩沿用 pi 的自动行为，不单独做接口。它是上下文体积的安全阀。
- 分支、fork、从某一条消息重开是高级能力。JSONL 里的树先留着，当前不设计接口。文件快照式的回滚也不做。

主题只影响 pi 的 TUI，服务端不管。

## 追踪

会话创建时把 `@langfuse/pi-observability-plugin` 的 `src/index.ts` 和 `pi-web-access` 的 `dist/index.js` 放进 `additionalExtensionPaths`。`noExtensions` 仍关掉磁盘扫描，这两条显式路径会加载。Langfuse 包没有 `main`，由基座用 jiti 读 TypeScript。`pi-web-access` 用发布包声明的 `./dist` 入口。自己写的扩展在 `app/server/src/extensions/`，由 `extensionFactories` 挂上：`providerRequestTrace` 在每次模型 API 调用前把请求体记成同一条 turn 下的 `Provider Request`；`createCodemodeExtension()` 提供 `codemode`。密钥在 `app/server/.env` 的 `LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`、`LANGFUSE_BASE_URL`。默认上传。`LANGFUSE_TRACING_ENABLED=false` 时两边都不报，改完重启 server。已实现说明见 [server-implemented.md](server-implemented.md) 的「追踪」（查阅时机：对一下面板里能看到什么、或临时关掉上传时）。

`pi-web-access` 的配置和抓取缓存跟 `PI_CODING_AGENT_DIR`。`ensureRelaxHome()` 启动时把它设成 `~/.relax/agent`，所以配置是 `~/.relax/agent/web-search.json`，全文缓存在 `~/.relax/agent/web-search-cache/`。文件不存在时写入 `{ "toolActivation": "eager" }`，四个联网工具从第一轮就在，不注册 `web_enable`。已有文件不覆盖。插件自带的斜杠命令仍会注册：用户原文以 `/` 开头且名字对上时，`prompt` 先执行命令，不把这句发给模型。

## 技能

创建会话时不传 `noSkills`，用基座 `DefaultResourceLoader` 的默认发现。不另做过滤，不加 `skillsOverride` 或 `additionalSkillPaths`。技能在创建这条 `AgentSession` 时读入。已经留在内存里的会话不重扫，卸掉再打开才看到磁盘上的修改。

用户级和项目级的目录名不一致，这一轮不改，以后再定。用户数据根是 `config.json` 的 `home`（默认 `~/.relax`），`agentDir` 是 `{home}/agent`，所以用户技能在 `{home}/agent/skills`，不在 `~/.pi/agent/skills`。项目目录名来自基座包 `@earendil-works/pi-coding-agent` 的 `package.json` 字段 `piConfig.configDir`，当前是 `.pi`。发布包启动时读这份 JSON。服务端配置改不了它。`{cwd}/.relax/skills` 不会被读到。改成 `.relax` 要换基座包的 `piConfig.configDir` 并重新安装；只改仓库里只读的 `pi/` 源码不会作用到正在用的 npm 包。只改这一个字段不必重编 TypeScript。

同名时先发现的留下。标识是 frontmatter 的 `name`，缺省用 `SKILL.md` 的父目录名。路径只是正文位置。系统提示里只有名字、描述和 markdown 的绝对路径，正文要由 `read` 再去读。按占住名字的顺序：

- `{cwd}/.pi/settings.json` 的 `skills` 数组。路径相对 `{cwd}/.pi`。基座写死 `.pi`。
- `{cwd}/.pi/skills`。只扫这一层 cwd，不向上找别的 `.pi/skills`。
- 从 cwd 向上每一层的 `.agents/skills`。基座写死 `.agents`。有 git 仓库时停在仓库根，否则到文件系统根。近的先于远的。`~/.agents/skills` 不放进这一串。
- `{home}/agent/settings.json` 的 `skills` 数组。路径相对 `{home}/agent`。
- `{home}/agent/skills`。
- `~/.agents/skills`。基座写死 `.agents`，不跟着 `home` 走。
- 上面两份 settings 里 `packages` 声明的 Pi package 所带的 `skills/`，或该包 `package.json` 的 `pi.skills`。排在最后。

当前挂上的 Langfuse 和 `pi-web-access` 的 `pi` 清单里没有 skills，不会从这两个扩展带出技能。也不会读 `~/.pi/agent/skills`。

目录内部：有 `SKILL.md` 就停在这一层，不再往下。没有则继续进子目录，跳过点目录和 `node_modules`，跟随符号链接，套用 `.gitignore`、`.ignore`、`.fdignore`。`{home}/agent/skills` 和 `{cwd}/.pi/skills` 会收根上带 `description` 的独立 `*.md`。`.agents/skills` 不收根上的 `*.md`。`name` 须为小写字母、数字、连字符，最长 64。`description` 必填，最长 1024。没有 description 的不加载。`disable-model-invocation: true` 仍占名字，但不进系统提示。基座没有单文件字节数上限，也没有条数上限。这一轮不加我们自己的上限。

信任以后再做入口。服务端没有让用户信任某个项目的接口，也不读写信任决定。创建会话时不传 `resolveProjectTrust`。基座 `SettingsManager` 默认把项目当成已信任，所以上面的项目级 `.pi` 和祖先 `.agents/skills` 现在会加载。基座自己的规则是未信任时不读这些项目资源，用户级 `{home}/agent/skills` 和 `~/.agents/skills` 仍读。信任文件在 `{home}/agent/trust.json`，当前没有功能去写它。

## 对话

存档和线上事件以 pi 为准：会话 JSONL，以及 `AgentSessionEvent` 里的消息和增量。服务端不另造一套事件类型。

前端现在的 `BlockFeedEvent`（只有用户文本、思考、正文）是 UI 先画出来的形状，不是长期协议。前端用薄适配器译成现有块，适配器放在 web 侧，见 [web-conversation.md](web-conversation.md)。后续界面往 pi 的消息格式靠，包括工具调用和压缩。

对话那一块：第一次发送即建会话（`create` 时不写空文件，第一条 user 消息写出）、列表、单条信息、历史（`buildSessionContext`）、删除、续发、中止、全局 SSE。列表 `status` 只有 `idle` / `running`（对齐 pi 的 `isStreaming`；自动重试仍算 running）。失败写在 messages 和 SSE 里，不另做会话态。标题只看 `sessions.name`。

工具调用、压缩、队列是 pi 事件里已有的。哪一块还没开，就在能力剖面里关掉对应能力，不把事件协议裁窄。开了之后原样转发。

### 智能体类

`app/server/src/agent/` 是唯一调用 pi 会话 API 的目录。类内部按 sessionId 缓存 `{ session: AgentSession }`，同一套工厂（内部 `createAgentSessionRuntime`，对外只返回 session）。对外 `prompt`（可无 id，可带 `thinkingLevel` 与 `streamingBehavior`）、`rename`、`abort`、`applyQueueModes`、`status`、`subscribe`。HTTP 和 SSE 只订这个类。档位查询和运行配置不经过这个类的模型调用；出队模式的热更新走 `applyQueueModes`。

剖面本轮：`tools` 为八个内置工具、`codemode` 和四个联网工具。loader 不传 `noSkills`，技能走基座默认发现。`noExtensions` / `noContextFiles` / `noPromptTemplates` / `noThemes` 仍关。`noExtensions` 只停磁盘扫描；`additionalExtensionPaths` 指向 Langfuse 和 `pi-web-access`；`extensionFactories` 来自 `app/server/src/extensions/`，含 `createCodemodeExtension()`。模型用白名单里的内置提供商，`agentDir` 指向 `~/.relax/agent`。

新对话：`SessionManager.create(cwd)` 后，用这条会话的 cwd 补项目行（没有行才插入），再立刻 `prompt`。文件等第一条 user 消息。思考档位默认 `medium`。正在回复时，不带 `streamingBehavior` 再 `prompt` 得 `BUSY`；`steer` 在当前回复及其工具结束后、下一次模型调用前插入，`followUp` 在本轮结束后再发。两者都不打断正在吐的字。多条排队的出队读全局 `~/.relax/agent/settings.json` 的 `steeringMode` / `followUpMode`（各自 `all` 或 `one-at-a-time`，缺省 `one-at-a-time`）。新建会话由基座 `SettingsManager` 合并该文件与工作区 `.pi/settings.json`，工厂里不调用 setter。`PATCH /api/settings` 之后，内存里的会话用 `setSteeringMode` / `setFollowUpMode` 立刻换模式。

历史：热会话用该 `sessionManager.buildSessionContext()`，并在后面附上还没落盘的 `streamingMessage`（同一条引用，或相同角色和时间戳，不重复）。否则 `SessionManager.open` 再同样调用，没有内存里的半截。返回 `{ messages, thinkingLevel, model }`，不手读 JSONL。

列表字段从 pi 的 `SessionInfo` 推导（去掉 `path`、`allMessagesText`，时间输出 ISO）。另加内存 `status`：`idle` | `running`。历史类型即 pi 的 `SessionContext`。字段含义不在本文展开，看 [api.html](../app/server/test/html/api.html) 各接口的请求类型和返回类型，或直接看 [sessions/types.ts](../app/server/src/sessions/types.ts) 与路由。查阅时机：改会话 JSON 形状时，改实现并改调试页上的类型，不必在本文再抄一份。

### 接口

`BUSY` 为 409。`GET /api/sessions/events` 写在 `/:id` 之前。请求和返回的字段以调试页为准。

- `POST /api/sessions` 第一次发送并创建，202。可选 `thinkingLevel`，不传则 `medium`。可选 `provider` 与 `model`，要一起给；不给则用全局默认。这个 cwd 还没有项目行时用目录名补登记，排到项目列表最前。已有行不改，已软删除的不恢复
- `GET /api/sessions` 列表，默认全部工作区。可按修改时间、`completed` 过滤，并按 `offset` 与 `limit` 截取。每条带 `completed`，响应带 `total`
- `GET /api/sessions/storage` 统计 `sessions/` 下的 jsonl 个数和目录字节数
- `POST /api/sessions/:id/completed` 把这条标成完成或未完成。文件不在则 404，并清掉标记
- `GET /api/projects` 未软删除的项目，按 `position` 倒序。可按登记时间过滤，并按 `offset` 与 `limit` 截取
- `GET /api/workspace` 未指定工作区时的目录，`{ cwd, name }`。`name` 是目录名。这个接口不写项目表。第一次在该目录新建会话时会写入
- `POST /api/projects` 登记一个已存在的目录。同一路径再登记会恢复已软删除的行
- `DELETE /api/projects/:id` 软删除，不删会话文件
- `POST /api/projects/:id/purge` 删掉该工作区的会话文件和这一行
- `POST /api/projects/:id/sessions/purge` 按修改时间早于某时刻，或已完成，删掉一部分会话文件
- `GET /api/sessions/:id` 一条信息
- `GET /api/sessions/:id/history` `buildSessionContext()`，热会话再附上 `streamingMessage`
- `DELETE /api/sessions/:id` 中止并逻辑删，JSONL 留在磁盘上，204
- `POST /api/sessions/:id/prompt` 续发，202。可选 `streamingBehavior`（`steer` | `followUp`）、`thinkingLevel`，以及一起出现的 `provider` 与 `model`。带了模型且与该会话上次不同时才写入会话
- `POST /api/sessions/:id/model` 只把所选模型写成全局默认，不改这条会话的上次模型
- `POST /api/sessions/:id/name` 手动设置 `name`，空字符串清空
- `POST /api/sessions/:id/abort` 中止。热会话按 `relax.abortPolicy`：`clear-then-abort`（默认）先 `clearQueue` 再 `abort`；`abort-only` 只 `abort`，队列留下。响应是会话信息加上 `cleared: { steering, followUp }`。没有清队列、会话不在内存里时两个数组为空，`status` 为 `idle`
- `GET /api/providers` 白名单提供商。`configured` 表示基座认为该提供商已有凭证
- `PUT /api/providers/:id` 写入或覆盖 api key。名单外 404
- `DELETE /api/providers/:id` 删除 `auth.json` 里的这一条。环境变量仍可让基座认为可用
- `GET /api/providers/:id/models` 该提供商的对话模型目录，不要求已填 key
- `GET /api/models` 当前可用对话模型。`available` 表示至少有一条。没有默认时会补写
- `GET /api/models/default` 全局默认。没有可用模型时 `model` 为 null
- `PUT /api/models/default` 修改全局默认，不改已经打开的会话
- `POST /api/models/refresh` 手动从 pi.dev 更新模型目录。测试不调用
- `GET /api/models/thinking-levels?provider=&id=` 查询该模型可选思考档位和默认档位 `medium`。目录里没有 404
- `GET /api/settings` 全局出队模式和中止策略。缺文件时返回默认值
- `PATCH /api/settings` 改上述字段的子集。出队模式写入后套到热会话
- `GET /api/sessions/events` 全局 SSE，不进 api.html。`data` 为 `{ sessionId, event }`，内层是 pi 的 `AgentSessionEvent`

SSE 断线不补，客户端用历史对齐。发送和中止走 HTTP。本轮不接 `app/web`。

`name` 在第一条用户消息写入时，若还没标题，就用这句文本。之后不覆盖。列表只返回 `name`。空字符串是清空。

往后放：第一次对话后用模型生成短标题写入 `name`。图片附件、模型选择器、编辑或重试某一条、分支树、checkpoint 回滚、命令审批。出队模式与中止策略已由 `GET` / `PATCH /api/settings` 配置，见上文。没有按单次请求覆盖的字段。

## 能力剖面

每次只做当时点名的一小块。没做的能力不会被顺手跑起来，做了的能力有上限，超限是拒绝，不是把进程拖死。

「先只做对话、关掉技能和工具」只是切分方式的例子，不是排期。

后面的块只加不改，接缝有四条：

- **能力剖面**。每次创建 `AgentSession` 都带一份显式剖面：工具、技能、扩展、规则和上下文文件、提示词，各自是关还是一组路径。关掉必须传给 pi（如 `noSkills`、`noExtensions`、不扫描上下文），不能靠这段代码还没写。工具用 `tools` 白名单。磁盘扩展仍关，只多给 `additionalExtensionPaths`（Langfuse、`pi-web-access`），再加上 `app/server/src/extensions/` 里的 factory。
- **列表**。本轮无索引，走 `SessionManager.list` / `listAll` 全量扫描，并上智能体里尚未落盘的热会话。
- **会话宿主**。智能体类持有多份 `AgentSession`（多工作目录可同时生成）。事件是 `(sessionId, AgentSessionEvent)`。SDK 会话默认不加载 CLI 的 `codemode` / MCP。`codemode` 由 `createCodemodeExtension()` 显式挂上。`tool_search` 和 MCP 当前不挂。
- **未做到的子系统不启动**。文件监听在有 WebSocket 订阅时才 `watch`，启动时不订磁盘。PTY 仍不在启动时加载。技能在创建会话时按基座默认目录扫描。

## 性能上限

单进程里，未捕获异常、同步读大文件、无限热会话或 watcher，会波及所有会话。下面的数字是初始天花板，做到那一块时再标定。超限返回错误，不在内存里排队。

- **启动**。只监听端口并确保 `.relax` 根存在。不扫全部会话，不建模型客户端，不 watch 磁盘。
- **列表**。读 `sessions` 表。不创建 runtime，也不为了算 `modified` 去读每份 JSONL。目录里还没有行的文件会补一次。
- **热会话**。有全局 SSE 订阅，或正在生成才驻留。`agent_end` 还不算出空闲，要到 `agent_settled`。本轮不限制同时打开或同时生成的条数（pi 也没有这两条限制）。没有任何订阅且已经 settled、文件已落盘的会话 `dispose`，下次从 JSONL 打开。
- **单会话单飞**。同一条会话已有生成时，不带 `streamingBehavior` 拒绝第二条（`BUSY`）。`steer` / `followUp` 只排队，不另开一条生成。
- **流式**。服务端不另存一份完整正文。pi 追加 JSONL，我们转发事件。客户端读得慢就背压，缓冲有上限，满了断开这一条连接。
- **历史**。只在打开该会话时读。单文件读取有上限。上下文体积靠 pi 自带压缩兜住。
- **事件循环**。请求路径上不同步读大目录或大文件。订阅回调里的异常记到该会话，不让进程退出。中止按 `relax.abortPolicy`，默认先清空排队文本，再传到模型请求。
- **文件监听**。客户端订一个根目录，服务端递归监听这棵树，防抖后推这棵树上的变化路径，不推整棵目录表。同时存在的根由 `config.json` 的 `fs.watchMax` 限制，默认 16。同一根的多条连接只占 1。服务端不过滤名字。
- **终端**（做到才启用）。PTY 个数有上限，回放缓冲约 100KB，关闭时必须释放文件描述符。
- **工具**。已启用八个内置工具（含 `bash`）和 `codemode`，以及 `pi-web-access` 的四个联网工具。`bash` 这一步没有另加超时或路径限制，范围是该会话的 cwd。`powershell` 非 Windows 上由基座在调用时报错。
- **技能**。已按基座默认目录加载，见「技能」。这一轮没有另加条数或正文大小上限。规则仍未做。

## 优先级

下面是依赖顺序，不是开工清单。每次指定一块，并用剖面把其余能力关掉。

1. 进程、`.relax` 根、健康检查、单会话错误不拖垮进程
2. 项目、默认工作区、会话索引（不调用模型）
3. 对话运行时：可选模型、流式、中止、`buildSessionContext` 历史、全局 SSE
4. 工具：读、写、编辑，然后才是 shell
5. 技能
6. 规则与系统提示词（开工前先核对 loader）
7. 文件系统读和监听
8. 终端
9. 用户名和头像

分支、fork、附件、命令审批不在这个序列里。多提供商里「一把 key 就能对话」的已经接上，自定义提供商和 OAuth 没有。前端接入另行指定。

## 文件系统

`chokidar` 加 WebSocket `/ws/fs`，不上 Watchman。`app/web` 仍用 mock，这一轮只接服务端和 [fs.html](../app/server/test/html/fs.html)。

路径必须是调用方传入的绝对路径。没传、相对路径、以 `~` 开头都是 400，服务端不展开家目录，也不设默认目录。不限制必须落在某个项目根里。服务端不过滤 `node_modules`、`.git`、`dist`，显示什么由调用方决定。

字段和错误文案以 [api.html](../app/server/test/html/api.html) 的「文件」分组为准。行为：

- `list` 只列一层，子项带自己的 `size` 和 `mtime`。目录的 `size` 不把里面的文件加总。
- `stat` 查单个路径的类型、大小和修改时间。
- `read` 的正文是原文，响应头 `X-Relax-Transfer` 为 `text` 或 `binary`。不带分段时流式吐出整个文件，开头 8 KiB 用来标类型。`offset`+`length` 与请求头 `Range` 二选一，读一段并返回 206。
- `PUT /api/fs/file` 的正文也是原文，请求头标明 `text` 或 `binary`。不带 `offset` 时先写临时文件，成功后再替换，失败留下原文件。`text` 要整段都是合法 UTF-8。带 `offset` 只接受 `binary`：小于当前长度则覆盖该段，等于则追加，大于则拒绝。
- `POST /api/fs/dir` 建目录。`DELETE /api/fs/file` 只删文件，`DELETE /api/fs/dir` 只删目录。目录默认必须为空，`recursive=true` 才连内容一起删。创建时 `recursive=true` 会把缺失的父目录一并建出。

`config.json` 的 `fs.maxBytes` 默认 16777216（16 MiB），只限制一次分段读取或一次写入的正文。整文件流式读不受这个上限。超过时 413，`code` 为 `PAYLOAD_TOO_LARGE`，`message` 写明当前字节数和上限。偏移落在文件末尾之后为 416，`code` 为 `RANGE_NOT_SATISFIABLE`。其它失败的 `message` 也要写出具体原因。

`/ws/fs` 的客户端消息是 `watch` / `unwatch`。服务端先回 `watching`，之后把 `fs.watchDebounceMs`（默认 600）窗口里的变化合成一条 `change`（`add`、`change`、`unlink`、`addDir`、`unlinkDir`）。失败回 `error`，里面是同一套 `{ code, message }`。同时监听的根目录棵数是 `fs.watchMax`，默认 16；同一个根的多条连接只占 1。没有订阅时不占描述符。

## 终端

一条 WebSocket `/ws/pty` 就是一台终端。同一目录连两次是两台。实现用 `node-pty`。`cwd` 必填，必须是已存在的绝对目录，放在查询参数里，由 `URLSearchParams` 编码一次；服务端用解码后的字符串，不展开 `~`，也没有默认目录。`cols` / `rows` 可省略，用 `config.json` 的 `pty.cols` / `pty.rows`（80 / 24）。shell 用 `SHELL`，没有则 `/bin/zsh`。

连上后服务端先发文本帧 `{ "type": "ready", "id" }`。`id` 只用于断线重连，由服务端生成。之后双向二进制帧是终端字节。文本帧 `{ "type": "resize", "cols", "rows" }` 改大小。`{ "type": "close" }` 是主动关闭，立刻杀掉进程。`node-pty` 的 `spawn-helper` 若没有执行位，进程会在第一次启动终端前补上。

没收到 `close` 就断开（网络波动，或调用方直接关掉套接字）时，进程和内存缓冲先留着，时限是 `pty.graceMs`（默认 15000）。期限内用 `?id=` 重连，`ready` 里带 `replay`（最近 `pty.replayBytes`，默认 100KB），再继续推实时输出。超时、主动关闭、shell 自己退出之后，这个 id 就没了。缓冲不写磁盘。服务重启后终端全部没有。同时存活的终端（含宽限中的）不超过 `pty.max`（默认 16）。

`app/web` 的终端插件仍用 mock。手工页是 [pty.html](../app/server/test/html/pty.html)。

## 通道

一个端口。已定入口：

- `GET /health`：健康检查，不在 `/api` 下。返回 `{ "status": "ok" }`
- HTTP JSON 用 `/api` 前缀。会话见上文接口。
- 对话推送：`GET /api/sessions/events`（SSE）
- 文件变化：WebSocket `/ws/fs`
- 终端：WebSocket `/ws/pty`。一条连接一台终端

跨域当前全部放开，响应带 `Access-Control-Allow-Origin: *`，不带 cookie。以后做登录再收紧。

错误体一律：

```json
{ "error": { "code": "NOT_FOUND", "message": "..." } }
```

骨架用 `BAD_REQUEST`、`NOT_FOUND`、`INTERNAL`。对话模块另有 `BUSY`（409）。文件读写另有 `PAYLOAD_TOO_LARGE`（413）和 `RANGE_NOT_SATISFIABLE`（416）。JSON 请求体上限是 `config.json` 的 `http.jsonBodyLimit`，默认 1 MiB。文件正文不走这个上限，单次写入和分段读取看 `fs.maxBytes`。SSE 心跳间隔是 `http.ssePingMs`，默认 15000。

`/api`、`/ws/fs`、`/ws/pty` 是不同路径，前面加反向代理时可以按前缀分别转发。两条 WebSocket 共用同一次 HTTP upgrade 分发：`ws` 若各自监听，路径不匹配时会回 400，把另一条的握手拆掉。

正在用的会话在内存里对应一份 `AgentSession`。列表来自 `SessionManager` 扫描，加上尚未落盘的热会话（`create` 之后、第一条 user 消息之前）。

## 目录

按职责分目录。入口文件只负责启动，不把路由、会话、文件监听堆在 `src/index.ts`。没做到的能力不建空目录，做到那一块再加对应目录，并在这里补上实际路径。

```
app/server/config.json  代码逻辑可调参数，按 home、fs、http、pty 分组
app/server/src/
  index.ts              加载 .env（端口 PORT），确保 ~/.relax/agent，监听端口
  app.ts                组装应用，测试从这里创建
  config/server.ts      读 config.json，缺组、缺字段或类型不对用代码默认值
  config/home.ts        home、agentDir、PI_CODING_AGENT_DIR
  config/settings.ts    全局 settings.json：出队模式与中止策略
  utils/errors.ts       错误类型与 Express 错误中间件
  utils/text.ts         消息纯文本
  utils/request.ts      请求体 text / cwd
  db/connection.ts      打开 {home}/sqlite/relax.sqlite
  projects/store.ts     项目登记
  sessions/             列、打开、历史、删、完成标记
  agent/                智能体类、Runtime 工厂、模型白名单
  routes/health.ts      GET /health
  routes/models.ts      提供商、可用模型、默认模型、手动刷新、思考档位
  routes/settings.ts    GET / PATCH /api/settings
  routes/sessions.ts    会话路由与 SSE
  routes/projects.ts    项目登记、计数、清除
  routes/fs.ts          文件列表、元信息、读写、建目录、删除
  fs/                   路径、读写、按根目录递归监听
  pty/                  一台 PTY 对应一条连接，宽限重连与滚动缓冲
app/server/test/
  health.test.ts
  sessions.test.ts
  sessions-http.test.ts
  agent.test.ts
  settings.test.ts
  fs.test.ts
  server-config.test.ts
  html/
    index.html        手工测试页目录
    sessions.html     会话联调：进页即连 SSE
    api.html          单接口调试，含请求类型与返回类型。SSE、/ws/fs 和 /ws/pty 也在这页
    fs.html           文件系统：左目录，右内容
    pty.html          终端：填目录新建，模拟断开可重连
```

`agent/` 是唯一直接调用 pi 会话 API 的目录。终端不经过 pi。

手工测试页在 [html/](../app/server/test/html/)，服务需已由 `pnpm dev:server` 拉起。`pnpm dev:server:open`（[script/dev-server-open.mjs](../script/dev-server-open.mjs)）做同一件事，并在 `/health` 成功后用系统打开本地 `index.html`。端口已被占用时不另起进程，只打开页面。`pnpm dev` 与 `pnpm start` 都走 [script/dev.mjs](../script/dev.mjs)：先跑 `dev:server`，`/health` 成功后再跑 `dev:web`；`3001` 或 web 的 `5173` 已在听则跳过对应那一个，不另占端口。查阅时机：要同时起服务端和前端时。会话相关接口互相依赖，用 [sessions.html](../app/server/test/html/sessions.html)：进入即连 `GET /api/sessions/events`，可在同一页发送、续发（含 steer / followUp）、设置思考档位、查询模型档位、设置标题、中止、列会话、看历史和删除。逐条接口仍用 [api.html](../app/server/test/html/api.html)，文件系统整页用 [fs.html](../app/server/test/html/fs.html)，终端整页用 [pty.html](../app/server/test/html/pty.html)。字段含义以该页的 `requestType` / `responseType` 为准。每新增一个接口，在文件顶部的 `ENDPOINTS` 追加一项并写上带字段注释的类型；接口调整时改这一处和实现，不必在本文再抄参数。查阅时机：加路由后自己点发送，或要看当前有哪些接口及其字段含义时。SSE、`/ws/fs` 和 `/ws/pty` 也登记在 api.html。

`ENDPOINTS` 每项必填 `group` / `name` / `method` / `path` / `summary` / `requestType` / `responseType`。`requestType`、`responseType` 是 TypeScript 文本，字段用行注释说明含义，调试页在「响应」后面以深色代码块展示。可填 `auth`（鉴权描述，如 `"JWT Bearer"`，不填则卡片显示「无需鉴权」）、`queryParams` / `bodyParams`（`{ name, type, required, description, example }` 数组，填了渲染参数卡并自动生成 cURL / JS 示例；`body` 是纯 JSON 字符串模板，不填且 `bodyParams` 也没填时 textarea 为空）。`path` 里的 `:name` 会自动变成可填写的路径参数，发送、顶栏路径和示例都会替换；可选 `pathParams`（形状同 `queryParams`）补充说明和示例。`queryParams` 同样有输入框：必填项用 `example` 预填，可选项留空，发送时只带已填写的项。可填 `headerParams`（形状同 `queryParams`），发送时放进请求头。`wire` 为 `sse` 或 `ws` 时卡片改走事件流或 WebSocket；`rawBody` / `rawResponse` 表示正文不是 JSON。这些字段不回传服务端，只是让调试页更接近接口文档的观感。

约定：

- 路由只调 `sessions/`、`agent/`、`fs/`、`pty/` 的函数，不在路由文件里 `import` pi 再组参数。
- 选 pi 的哪个函数，先看 `pi/packages/coding-agent/src/core/` 里该函数的实现和调用方，确认它是「创建一条」「切换当前一条」还是「只动文件」。不合理的用法不进 `agent/`。
- 新能力加新文件或新目录。一个文件变长到要同时管两件不相干的事，就拆开。
- 改行为、改路径、改上限时，同一次改动更新本文对应小节。只改代码不改本文，算这步没做完。

## 和 Cursor / Codex 的差距

多项目、多会话、不选项目也能聊，这一层对齐。流式正文、思考、中止、历史回放，pi 够用，线上格式跟 pi。工具已按白名单打开。技能按基座默认目录加载，见「技能」。规则的 loader 行为还没核对。模型用白名单里的内置提供商，密钥在 `auth.json`。文件变化按调用方给定的根目录递归监听，`app/web` 还没接。终端不经过 pi。

往后放的能力：分支和 fork、附件、检查点回滚、命令审批、多根工作区。用户名和头像优先级最低。
