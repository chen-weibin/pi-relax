# 对话区渲染架构

查阅时机：改对话列表、块类型、贴底滚动、打字机、把 mock feed 换成真实 `AgentSessionEvent` 时。布局 / token / 四区 shell 仍看 [`web.md`](web.md)。UI 组件(用什么 / 别造轮子)见 [`docs/ui.md`](ui.md);原子组件 API / 视觉细节见 [`web.md` §UI 组件库](web.md#ui-组件库ui)。

## 分层

```
mock fixture / playMockStream          未来: AgentSessionEvent
        │                                      │
        │                                      ▼
        │                           adapter（未实现）
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
              BlockFeedEvent
                       │
                       ▼
         createBlockRuntime()          ← app/web/src/conversation/
                       │
                       ▼
            ConversationSnapshot
             (blocks + messages + runPhase + revision)
                       │
          Conversation（组装：注入 runtime / mock feed）
                       │
                       ▼
              ConversationView          ← 只认 snapshot，不 new runtime
                       │
         message 分组 → renderBlock registry[BlockKind]
                       │
         User / Thinking / Assistant / Generic
                       │
                       ▼
         ui/（MarkdownView, TypewriterText, DisclosureRow, MessageSurface）
```

| 层 | 路径 | 职责 |
|---|---|---|
| 数据层 | [`app/web/src/conversation/`](../app/web/src/conversation/) | `BlockFeedEvent`、判别联合 `BlockSnapshot`、`createBlockRuntime`、`runPhase` |
| 组装 | [`Conversation.tsx`](../app/web/src/components/conversation/Conversation.tsx) | 持有 runtime、订 snapshot、注入 mock feed |
| 渲染 | [`components/conversation/`](../app/web/src/components/conversation/) | 按 message 分组画扁 block 列表；registry 用 `BlockKind` |
| 观感 | [`ui/`](../app/web/src/ui/) | 无 user/thinking 词 |
| mock | [`mock/conversation/`](../app/web/src/mock/conversation/) | 仅 fixture、`playMockStream`、`DevToolbar`、`useMockFeed` |

渲染层禁止 `import` mock，禁止在 View 里 `createBlockRuntime()`。

## 数据模型

`BlockSnapshot` 按 `kind: BlockKind` 判别。v1：`user-text` / `thinking` / `text`。每种有自己的 `data`（v1 都是 `{ text: string }`，但类型不共用，方便以后 tool / 图片 / 错误用别的形状）。

块上只保留 `contentPhase` + `data`。已删除 `executionPhase` / `revealPhase` / `snapshotOf`。打字机播放是 Thinking 组件的局部 UI 状态，不回写 runtime。

`ConversationSnapshot`：

- `order` / `byKey`：扁 block 列表（仍用于渲染每一块）
- `messageOrder` / `messages`：按 `messageId` 分组（复制 / 重试 / 间距的前置；按钮未做）
- `runPhase`：会话级 `'idle' \| 'running' \| 'awaiting' \| 'complete' \| 'error'`
- `revision`：每次 emit +1（贴底不再依赖它，列滚动交给 `use-stick-to-bottom`）

等待态（「生成中」）只看 `runPhase === 'awaiting'`，不嗅探「最后一块是 complete 的 thinking」。

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

- 对话列贴底：[`use-stick-to-bottom`](https://www.npmjs.com/package/use-stick-to-bottom) 的 `StickToBottom`（在 `Conversation.tsx`）。初次载入 / 内容变高用 `instant`；用户上滑暂停、滚回底部恢复；发送与「模拟流式」调用 `scrollToBottom('instant')` 强制拉回。不上虚拟列表。
- Streamdown `animated`（`blurIn`）只作用于流式 Markdown 正文怎么出现，与列滚动无关。代码块内部滚动由 `isAnimating` + `MarkdownView` 外壳 `max-height: 400px` 处理。
- [`TypewriterText`](../app/web/src/ui/TypewriterText.tsx)：grapheme 按前缀增量缓存；只在 `playing` 且未追上时 rAF；追上停帧。`playing={open && streaming}`，折叠时不跑。不再用于助手正文。

## mock vs 真实事件

当前 mock 直接生产 `BlockFeedEvent`。真实链路预留：

`AgentSessionEvent` → **adapter（未写）** → `BlockFeedEvent` → `runtime.apply`。

adapter 建议将来放 `app/web/src/conversation/adaptAgentSession.ts`（或 server 侧先规范化）。未接 [`relax-agent`](relax-agent.md)。

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
| 列表间距、message 分组、「生成中」 | `ConversationView.tsx` | 不要为了「生成中」嗅探最后一块 kind；贴底在 `Conversation.tsx` 的 `StickToBottom` |
| 色/字号/圆角 token | `src/index.css` + [`design-system.md`](design-system.md) | 不要在块组件里写死 hex |

> 任何 ui 组件的「何时用 / 何时不用 / API」,查 [`docs/ui.md`](ui.md);不在本表重复。

思考块：默认收起；历史与流式都可展开/收起；流式时标题走 `ShinyText`(由 `DisclosureRow.blinking` 控制);`isAnimating={open && streaming}`。Composer 未接 `onSubmit` 到 session。DevToolbar 只有历史渲染与模拟流式。

## 明确不做

- 虚拟列表
- 接入真实 agent session / `AgentSessionEvent`
- 复制 / 重试按钮（分组已在 snapshot 里）
- tool / 图片 / 错误块 UI（类型可加）
- 把 `revealPhase` 接回 runtime
- 把 `src/conversation/` 数据层并进 `components/conversation/`（与 UI 分目录；职责见上文分层）

## 调试期默认

- `Conversation.tsx` 挂载即 `useEffect(loadHistory)`:打开页面直接看到历史快照,免手动点 DevToolbar。DevToolbar 的「loadHistory / playStream」按钮保留,用于在流式之后回到快照 / 重放。
- 历史与流式 fixture(`mock/conversation/history.ts`、`stream.ts`)覆盖 `MarkdownView` 支持的全部格式(标题、段落含 bold/italic/inline code/link、嵌套 ul、ol、blockquote、围栏代码块高亮、Mermaid、`$$` 公式、CJK 强调紧贴全角标点、hr),方便逐项调试视觉。详见 [`docs/ui.md` §MarkdownView](ui.md#markdownview)。
