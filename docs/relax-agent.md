# relax-agent

`@earendil-works/pi-coding-agent` 之上对 MiniMax (Anthropic Messages 兼容) 的薄封装。

## 入口

```ts
import { createAgent } from "relax-agent"

const { session } = await createAgent({
  model: "MiniMax-M3",
  apiKey: process.env.MINIMAX_API_KEY!,
})

session.subscribe((e) => {
  if (e.type === "message_update" && e.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(e.assistantMessageEvent.delta)
  }
})

await session.prompt("你好")
```

返回值直接复用 `CreateAgentSessionResult`,使用方式与裸调 `createAgentSession` 一致。

## `CreateAgentOptions`

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `model` | `string` | `"MiniMax-M3"` | MiniMax 模型 id,见下方支持清单 |
| `apiKey` | `string` | 必填 | MiniMax 平台 apiKey,**每次调用纯函数式传入,不落盘** |
| `thinkingLevel` | `ThinkingLevel` | `"off"` | 思考等级;M3 设 `"high"` 即启用 adaptive thinking |
| `cwd` | `string` | `process.cwd()` | 会话工作目录 |
| `sessionManager` | `SessionManager` | `SessionManager.inMemory()` | 不落盘的内存 session |

## 支持的 MiniMax 模型

数据源:[platform.minimaxi.com 文档](https://platform.minimaxi.com/docs/api-reference/text-anthropic-api)。

| 模型 id | 上下文 | 输入 | thinking |
| --- | --- | --- | --- |
| `MiniMax-M3` | 1,000,000 | text + image | 可关,默认 off;传 `thinkingLevel: "high"` 启用 adaptive |
| `MiniMax-M2.7` | 204,800 | text | 不可关 |
| `MiniMax-M2.7-highspeed` | 204,800 | text | 不可关 |
| `MiniMax-M2.5` | 204,800 | text | 不可关 |
| `MiniMax-M2.5-highspeed` | 204,800 | text | 不可关 |
| `MiniMax-M2.1` | 204,800 | text | 不可关 |
| `MiniMax-M2.1-highspeed` | 204,800 | text | 不可关 |
| `MiniMax-M2` | 204,800 | text | 不可关 |

模型清单硬编码在 [`packages/relax-agent/src/create-agent.ts`](../packages/relax-agent/src/create-agent.ts)。**新增模型时只需在该文件追加条目**,无需改其它地方。

## 实现要点

- **Provider**:每次调用现建一个 `ModelRuntime`(纯函数式,多租户安全),用 `InMemoryCredentialStore` 不落盘,通过 `registerProvider("minimax", { api: "anthropic-messages", baseUrl: "https://api.minimax.cn/anthropic", apiKey, models })` 注册 MiniMax。
- **API 协议**:`anthropic-messages`(Anthropic Messages 兼容),baseUrl 走 `https://api.minimax.cn/anthropic`,Auth 走 `x-api-key` 而非 Bearer。
- **不暴露**:OAuth、`~/.pi/agent/auth.json` 持久化、工具注册、扩展 — 后续真要再加,先讨论设计。

## 开发

`pnpm dev:server` 一条命令启全部:

1. `tsdown --watch` 监听 [`packages/relax-agent/src/`](../packages/relax-agent/src/),改动后重建 `dist/index.mjs`
2. `tsx watch` 监听 `app/server/src/`,发现 `dist/index.mjs` 变化即重启 server
3. 二者由 [`script/dev-server.mjs`](../script/dev-server.mjs) 编排,SIGINT 同时退出

### 为什么 dev 脚本里没有 `--conditions=source`

历史上 `tsx --conditions=source` 让 server 直接读 relax-agent 的 .ts 源码 → 编辑源码即生效、无需 rebuild。但该 flag 会让全局按 source condition 解析所有 import,踩到 `@earendil-works/chord` 的已知问题 —— 它的 package.json 在 `"source"` 下指向 `src/context/index.ts`,但该文件在 node_modules 中不存在(chord 只发布 dist)。故去掉 flag,改为 tsdown 持续重建 + tsx 监听 dist 触发重启。

### 为什么 `tsdown.config.mjs` 的 `clean` 关掉

`clean: true` 在 watch 模式下每次重建**先删后写** dist/,与并行启动的 server 形成 race —— tsx 抢在 tsdown 重建完成前就加载 `dist/index.mjs`,读到的是被删除的空窗期。dist 文件名稳定,直接覆盖即可。

## 验证

最小闭环验证(已在 tmp/ 中运行过):

```bash
pnpm --filter @relax/server exec tsx src/index.ts
# 期望:打印 "你好!..." 类响应
```

或者 `pnpm dev:server` 触发完整 rebuild → 重启链路。
