# app/server 已实现功能

只记当前代码里已经能用的能力。规划、上限和还没做的块在 [server.md](server.md)。查阅时机：想看服务端现在做到哪、对照联调页该点哪一项时。改行为时和 [server.md](server.md) 一起改本页。

手工入口：`pnpm dev:server`（端口 `3001`）。逐条 HTTP 用 [api.html](../app/server/test/html/api.html)，整段会话用 [sessions.html](../app/server/test/html/sessions.html)。前端 `app/web` 还没接这些接口。

## 进程

1. `GET /health` 返回 `{ "status": "ok" }`。
2. 数据根默认 `~/.relax`，`RELAX_HOME` 可整棵换走。会话文件在 `~/.relax/agent/sessions/`，不写进 `~/.pi`。
3. 未指定工作区时，cwd 用 `~/.relax/workspace`（随 `RELAX_HOME` 换走）。
4. HTTP JSON 走 `/api`，错误体是 `{ "error": { "code", "message" } }`。跨域放开，不带 cookie。

## 会话

1. 第一次发送即创建会话并流式回复。不先写空文件，第一条 assistant 出现后才落盘。
2. 续发。同一条会话正在生成时，不带插队方式再发会返回 409 `BUSY`。
3. 生成中可以继续发。`steer`：当前这次回复及其工具调用结束后、下一次模型调用前插入。`followUp`：这一轮全部结束后再发。两种都不打断正在吐的字。
4. 中止当前生成。没有在生成也成功。
5. 列会话，可按工作区过滤。单条信息。历史用 pi 的 `buildSessionContext()`，含消息、当前思考档位和模型。
6. 删除：先中止，再删会话文件。
7. 手动设置标题。空字符串清空。列表同时给 `name` 和 `firstMessage`；没设过标题时 `name` 为空，界面用第一条用户消息兜底。不会在第一次发送时自动生成标题。
8. 全局 SSE：`GET /api/sessions/events`。每条是 `{ sessionId, event }`，内层是 pi 的 `AgentSessionEvent`（正文增量、队列变化、标题变化、思考档位变化都在里面）。断线不补，用历史对齐。
9. 多条会话可以同时打开或同时生成。没有订阅且不在生成的会话会从内存卸掉，下次从文件打开。
10. 上下文压缩沿用 pi 的自动行为，没有单独的压缩接口。

## 模型与思考档位

1. 当前只注册 MiniMax-M3，密钥用 `MINIMAX_API_KEY`。
2. 新会话思考档位默认 `medium`。创建和续发都可以指定档位；不在该模型支持列表里则 400。
3. 按模型查询可选档位：`GET /api/models/thinking-levels?provider=minimax&id=MiniMax-M3`。未注册的模型返回 404。MiniMax-M3 当前是 `off`、`minimal`、`low`、`medium`、`high`。

## 当前关掉的剖面

工具、技能、扩展、提示词模板、主题、上下文文件都显式关掉。文件监听和终端还没做。
