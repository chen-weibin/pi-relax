# app/server 已实现功能

只记当前代码里已经能用的能力。规划、上限和还没做的块在 [server.md](server.md)。查阅时机：想看服务端现在做到哪、对照联调页该点哪一项时。改行为时和 [server.md](server.md) 一起改本页。

手工入口：`pnpm dev:server`（端口 `3001`）。`pnpm dev:server:open` 拉起同一个服务，`/health` 成功后用系统打开本地 [index.html](../app/server/test/html/index.html)（`open` 文件，不另起静态服务）；该端口已在听则只打开页面。逐条 HTTP 用 [api.html](../app/server/test/html/api.html)，整段会话用 [sessions.html](../app/server/test/html/sessions.html)。会话页的模型下拉来自 `GET /api/models`：没选中会话时显示新建将用的模型，选中后显示该会话历史里的模型。改下拉只改全局默认；发送时带上所选模型，和该会话上次不同才写入会话。前端 `app/web` 还没接这些接口。

## 进程

1. `GET /health` 返回 `{ "status": "ok" }`。
2. 数据根默认 `~/.relax`，`RELAX_HOME` 可整棵换走。会话文件在 `~/.relax/agent/sessions/`，不写进 `~/.pi`。
3. 未指定工作区时，cwd 用 `~/.relax/workspace`（随 `RELAX_HOME` 换走）。
4. HTTP JSON 走 `/api`，错误体是 `{ "error": { "code", "message" } }`。跨域放开，不带 cookie。

## 会话

1. 第一次发送即创建会话并流式回复。不先写空文件，第一条 user 消息发出后落盘。
2. 续发。同一条会话正在生成时，不带插队方式再发会返回 409 `BUSY`。
3. 生成中可以继续发。`steer`：当前这次回复及其工具调用结束后、下一次模型调用前插入。`followUp`：这一轮全部结束后再发。两种都不打断正在吐的字。多条排队时怎么出队由全局 `~/.relax/agent/settings.json` 的 `steeringMode` / `followUpMode` 决定，各自为 `all`（到达出队点时一次注入全部）或 `one-at-a-time`（一次一条）。缺文件时都是 `one-at-a-time`。`PATCH /api/settings` 写入后，已经在内存里的会话会立刻改用新模式。新建会话仍由基座合并全局文件和该工作区 `.pi/settings.json`。
4. 中止当前生成。没有在生成也成功。策略在同一份全局文件的 `relax.abortPolicy`：`clear-then-abort`（默认，先清空 steer / followUp 再停当前这一轮）或 `abort-only`（只停当前这一轮，队列留下，之后仍会发出去）。热会话中止时再读全局文件和该工作区 `.pi/settings.json`，项目层的 `relax.abortPolicy` 盖过全局。`clear-then-abort` 的响应在会话信息上多一个 `cleared`（`steering` 与 `followUp` 两条文本数组）；`abort-only` 时这两个数组为空。没有请求字段。
5. 列会话，可按工作区过滤。单条信息。历史用 pi 的 `buildSessionContext()`，含消息、当前思考档位和模型。
6. 删除：先按上面的中止策略停掉，再删会话文件。
7. 手动设置标题。空字符串清空。列表同时给 `name` 和 `firstMessage`；没设过标题时 `name` 为空，界面用第一条用户消息兜底。不会在第一次发送时自动生成标题。
8. 全局 SSE：`GET /api/sessions/events`。每条是 `{ sessionId, event }`，内层是 pi 的 `AgentSessionEvent`（正文增量、队列变化、标题变化、思考档位变化都在里面）。断线不补，用历史对齐。
9. 多条会话可以同时打开或同时生成。有全局 SSE 订阅，或还在生成（含 `agent_end` 之后、`agent_settled` 之前）的会话留在内存里。没有任何订阅且已经 settled、文件已落盘的会话会卸掉，下次从文件打开。
10. 上下文压缩沿用 pi 的自动行为，没有单独的压缩接口。

## 运行配置

1. 全局文件是 `~/.relax/agent/settings.json`（随 `RELAX_HOME` 换走），与基座 `settings.json` 同一相对路径。不另建配置文件。
2. `GET /api/settings` 返回 `steeringMode`、`followUpMode`、`abortPolicy`。缺文件时为 `one-at-a-time`、`one-at-a-time`、`clear-then-abort`。
3. `PATCH /api/settings` 只改传入的字段。出队模式写在顶层，中止策略写在 `relax.abortPolicy`。文件里其它键保留。空对象、未知字段、非法枚举为 400。
4. 接口只读写全局这一份。工作区 `.pi/settings.json` 仍可按基座规则盖过，新建会话和中止时会看到项目层。

## 模型与思考档位

1. 白名单在 `app/server/src/agent/models.ts`。只收一把 key 就能对话的内置提供商。`azure`、`openai-codex`、Bedrock、Vertex、Cloudflare、`typesafe` 不在里面。升 `@earendil-works/pi-ai` 后要对照 `providers/*.ts` 再核一次。
2. `PUT /api/providers/:id` 把 api key 写入 `~/.relax/agent/auth.json`。同一 id 再提交是修改。响应不带回 key。`DELETE` 只删这一条存储。
3. 基座认为有凭证就算可用：`auth.json`、环境变量、本机凭证。不发请求试 key。`GET /api/models` 的 `available` 表示当前至少有一条可用对话模型。
4. 全局默认是 `settings.json` 的 `defaultProvider` 和 `defaultModel`。还没有可用默认、但已经有可用模型时，查询可用列表或读取默认会按基座内置顺序补写。`PUT /api/models/default` 只改这一对，不改热会话。
5. 新建会话用全局默认。请求里同时带 `provider` 和 `model` 时，这次用它，并写成新的默认。一个可用模型都没有时 409 `PROVIDER_REQUIRED`。
6. `POST /api/sessions/:id/model` 只把所选模型写成全局默认，不改这条会话的上次模型。续发带了 `provider` 和 `model`，且与该会话上次记录不同时，才追加 `model_change`。没带则继续用该会话已恢复的模型。打开旧会话、只改默认不发送，记录保持不变。
7. `POST /api/models/refresh` 手动更新目录，转调基座 `refresh({ allowNetwork: true, force: true })`，缓存进 `models-store.json`。
8. 新会话思考档位默认 `medium`。创建和续发都可以指定档位；不在该模型支持列表里则 400。
9. `GET /api/models/thinking-levels?provider=&id=` 查目录里的模型。没有则 404。

## 追踪

1. 会话工厂把 `@langfuse/pi-observability-plugin@0.1.2` 的入口放进 `additionalExtensionPaths`。磁盘上的其它扩展仍然不加载。官方插件记的是这一轮用户刚说的那句。
2. 自己写的扩展在 `app/server/src/extensions/`。当前 `providerRequestTrace` 在每次模型 API 调用前，把请求体记到同一条 Conversational Turn 下的 `Provider Request`。那份 input 是发给接口的参数，`messages` 含此前轮次。请求体里的 `apiKey` 会打码。环境里的模型 key 和 Langfuse 密钥也会从正文里换掉。不上传 `Authorization` 头。
3. 密钥在 `app/server/.env`：`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`、`LANGFUSE_BASE_URL`（当前是 `https://cloud.langfuse.com`）。一次用户消息一条 trace，同一条会话共用一个 session。
4. 默认上传。`LANGFUSE_TRACING_ENABLED=false` 时两边都不报，改完要重启 server。

## 工具

1. 白名单一次打开八个内置工具：`read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`、`powershell`。`powershell` 在非 Windows 上可以注册，调用时基座报错。
2. `codemode` 用 `createCodemodeExtension()` 挂上，并写进同一份白名单。`tool_search` 不开。
3. `pi-web-access@0.38.0` 放进 `additionalExtensionPaths`（`dist/index.js`）。启用 `web_search`、`fetch_content`、`get_search_content`、`source_check`。`~/.relax/agent/web-search.json` 不存在时写入 `{ "toolActivation": "eager" }`，不注册 `web_enable`。已有文件不覆盖。
4. 抓取全文缓存在 `~/.relax/agent/web-search-cache/`。插件读的是 `PI_CODING_AGENT_DIR`，启动时已指到 `~/.relax/agent`。
5. 斜杠命令仍注册。用户原文以 `/` 开头且名字对上时，先执行命令，不把这句发给模型。

## 当前关掉的剖面

技能、提示词模板、主题、上下文文件都显式关掉。磁盘扩展不扫。`tool_search` 和 `web_enable` 不开。文件监听和终端还没做。

## 手工脚本

`app/server/test/user/` 放自己跑的验证脚本，不进 `pnpm test`。用法写在各文件顶部。查阅时机：要看当前构建出来的系统提示词时执行 `tsx system-prompt.ts`；要看已声明给模型的工具时执行 `tsx tools.ts`。都在该目录下跑，加 `--file` 写到 `output/`：系统提示词是 `system-prompt.md`，工具是 `tools.json`。
