# app/server 已实现功能

只记当前代码里已经能用的能力。规划、上限和还没做的块在 [server.md](server.md)。查阅时机：想看服务端现在做到哪、对照联调页该点哪一项时。改行为时和 [server.md](server.md) 一起改本页。

手工入口：`pnpm dev:server`（端口 `3001`）。逐条 HTTP 用 [api.html](../app/server/test/html/api.html)，整段会话用 [sessions.html](../app/server/test/html/sessions.html)。前端 `app/web` 还没接这些接口。

## 进程

1. `GET /health` 返回 `{ "status": "ok" }`。
2. 数据根默认 `~/.relax`，`RELAX_HOME` 可整棵换走。会话文件在 `~/.relax/agent/sessions/`，不写进 `~/.pi`。
3. 未指定工作区时，cwd 用 `~/.relax/workspace`（随 `RELAX_HOME` 换走）。
4. HTTP JSON 走 `/api`，错误体是 `{ "error": { "code", "message" } }`。跨域放开，不带 cookie。

## 会话

1. 第一次发送即创建会话并流式回复。不先写空文件，第一条 user 消息发出后落盘。
2. 续发。同一条会话正在生成时，不带插队方式再发会返回 409 `BUSY`。
3. 生成中可以继续发。`steer`：当前这次回复及其工具调用结束后、下一次模型调用前插入。`followUp`：这一轮全部结束后再发。两种都不打断正在吐的字。多条排队时怎么出队固定为基座默认的一次一条（`steeringMode` / `followUpMode` 都是 `one-at-a-time`）。以后可以各自改成 `all`（到达出队点时一次注入全部）或 `one-at-a-time`，对应基座 `setSteeringMode` / `setFollowUpMode`。现在没有请求字段，也没有 settings 项。
4. 中止当前生成。没有在生成也成功。热会话固定先清空 steer / followUp 队列，再停当前这一轮，避免留下的队列在后续回合发出去。响应在会话信息上多一个 `cleared`（`steering` 与 `followUp` 两条文本数组，没有队列时为空）。以后中止策略可配置，已知还会有只终止当前、队列保留（`abort-only`）。现在没有请求字段，也没有 settings 项。
5. 列会话，可按工作区过滤。单条信息。历史用 pi 的 `buildSessionContext()`，含消息、当前思考档位和模型。
6. 删除：先按上面的中止策略停掉（现在是先清队列再中止），再删会话文件。
7. 手动设置标题。空字符串清空。列表同时给 `name` 和 `firstMessage`；没设过标题时 `name` 为空，界面用第一条用户消息兜底。不会在第一次发送时自动生成标题。
8. 全局 SSE：`GET /api/sessions/events`。每条是 `{ sessionId, event }`，内层是 pi 的 `AgentSessionEvent`（正文增量、队列变化、标题变化、思考档位变化都在里面）。断线不补，用历史对齐。
9. 多条会话可以同时打开或同时生成。有全局 SSE 订阅，或还在生成（含 `agent_end` 之后、`agent_settled` 之前）的会话留在内存里。没有任何订阅且已经 settled、文件已落盘的会话会卸掉，下次从文件打开。
10. 上下文压缩沿用 pi 的自动行为，没有单独的压缩接口。

## 模型与思考档位

1. 当前只注册 MiniMax-M3，密钥用 `MINIMAX_API_KEY`。
2. 新会话思考档位默认 `medium`。创建和续发都可以指定档位；不在该模型支持列表里则 400。
3. 按模型查询可选档位：`GET /api/models/thinking-levels?provider=minimax&id=MiniMax-M3`。未注册的模型返回 404。MiniMax-M3 当前是 `off`、`minimal`、`low`、`medium`、`high`。

## 追踪

1. 会话工厂把 `@langfuse/pi-observability-plugin@0.1.2` 的入口放进 `additionalExtensionPaths`。磁盘上的其它扩展仍然不加载。官方插件记的是这一轮用户刚说的那句。
2. 自己写的扩展在 `app/server/src/extensions/`。当前 `providerRequestTrace` 在每次模型 API 调用前，把请求体记到同一条 Conversational Turn 下的 `Provider Request`。那份 input 是发给接口的参数，`messages` 含此前轮次。不上传 `Authorization`。
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
