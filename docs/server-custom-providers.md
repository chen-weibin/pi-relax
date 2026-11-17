# 自定义提供商

查阅时机：接 Ollama / LM Studio / 其它 OpenAI 兼容端点，改 `/api/custom-providers*`，或做前端配置表单时。服务端总览仍看 [server.md](server.md)；已实现清单看 [server-implemented.md](server-implemented.md)。Setting 里的表单见 [web-setting.md](web-setting.md)「模型」（查阅时机：改添加 / 编辑弹框的字段时）。

## 机制

- 持久化只写 `~/.relax/agent/models.json`（随 `config.json` 的 `home`）。SDK 只读该文件；服务端自己锁写后对 `ModelRuntime` 做 `refresh({ allowNetwork: false })`。
- 凭证放在 provider 的 `apiKey` 字段（可占位，如 Ollama 的 `"ollama"`）。不走内置的 `PUT /api/providers/:id` → `auth.json`。
- 配好后与已填 key 的内置提供商共用可用列表、默认模型、新建/切换会话、thinking-levels。`GET /api/providers` 用 `kind: "custom"` 区分。

## 表单字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 创建时 | `^[a-z][a-z0-9_-]{0,63}$`；不可撞 `KEY_PROVIDERS`；不可已存在 |
| `name` | 否 | 显示名 |
| `baseUrl` | 是 | `http`/`https` URL，如 `http://localhost:11434/v1` |
| `api` | 是 | `GET /api/custom-providers/meta` 返回的列表之一，常用 `openai-completions` |
| `apiKey` | 创建必填；更新可省略 | 省略更新时保留原值；响应永不回明文，只给 `apiKeySet` |
| `headers` / `authHeader` | 否 | 透传进 models.json |
| `models[]` | 至少一个 | `id` 必填；可选 `name` / `reasoning` / `contextWindow` / `maxTokens` |

本期 API 不暴露完整 `compat`；需要时仍可手改 `models.json`。

## 接口

- `GET /api/custom-providers/meta`
- `GET /api/custom-providers`
- `GET /api/custom-providers/:id`
- `POST /api/custom-providers` → 201
- `PUT /api/custom-providers/:id`（整表替换）
- `DELETE /api/custom-providers/:id` → 204

Ollama 示例见联调页 [api.html](../app/server/test/html/api.html)「创建自定义提供商」预填的 `gemma4:e4b`。

## 边界

- 不探测上游连通性；不参与 `POST /api/models/refresh` 的 pi.dev 拉取。
- 本地模型请按真实窗口填 `contextWindow`，缺省会落到基座默认（约 128k），可能 OOM。
- OAuth 与动态 `/v1/models` 发现不做。
