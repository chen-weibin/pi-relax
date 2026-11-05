# 右侧扩展区（插件）

查阅时机：在 `app/web` 增加扩展插件、改壳层 tab / 欢迎页、改关最后一 tab 的收起策略、改文件树或终端、或把适配器换成另一套后端时。

布局外壳（三栏尺寸、`extensionOpen`）见 [web.md](web.md)。原子组件见 [ui.md](ui.md)。

## 结构

```
app/web/src/extensions/
├── types.ts              # ExtensionPlugin / ExtensionTab / 空态策略
├── store.ts              # 壳层 tab；终端快照按对话写入 local store；含 updateTab
├── registry.ts           # 编译期登记表
├── shell/                # 欢迎页、唯一一层 tab 条、添加菜单
├── contracts/            # FsApi / PtyApi；文件走 /api/fs 与 /ws/fs，终端走 /ws/pty
└── plugins/files|terminal
```

`components/Extension.tsx` 只 re-export `extensions/shell/Extension`，`pages/Workspace.tsx` 挂 `<Extension />`。

## 只有一层壳层 tab

打开文件、打开终端都走 `openTab`。插件不做自己的 tab 条。文件树和终端会话列表都在插件 `PaneHeader` 内折叠，不走壳层 `renderSide`。

壳层 tab 图标：`tab.icon ?? plugin.icon`。彩色类型图标在 [`icons/fileTypes.tsx`](../app/web/src/icons/fileTypes.tsx)，匹配在 [`icons/matchFileIcon.ts`](../app/web/src/icons/matchFileIcon.ts)，登记表在 [`plugins/files/fileKinds.ts`](../app/web/src/extensions/plugins/files/fileKinds.ts)。

壳层 tab 选中底用 `bg-surface-hover`（`#303030`），不用 `bg-surface-active`。条本身贴在 `--app`（`#151515`）上，`#353535` 会显得过亮。文字仍是 `text-fg-bright`。未选中悬停同色，靠常驻底色和更亮的字区分选中。

壳层 tab 条溢出时：`+` 钉在右侧，条可横向滚动（无滚动条；悬停时滚轮竖滑改成横滑）。**选中 / 新增 / 从右侧会话列表切入** 时，会把当前 tab **完整**滚进可视区，避开右侧 `+` 和渐隐遮罩（半截挡住也要滚到全部露出）。`prefers-reduced-motion` 时不做平滑滚动。

`reuseKey`（与 `pluginId` 一起判重，命中则激活）：

| 场景 | reuseKey |
|---|---|
| 文件空 tab（未绑定路径） | `explorer` |
| 打开文件 | `file:<path>` |
| 终端会话 | `session:<uuid>` |

### 文件 tab 绑定

目录树是**一份**（`useFilesTreeStore`：展开 / children 缓存 / `navOpen`）。选中路径**不进树 store**，读当前 tab 的 `payload.path`。

点文件走 `selectFile`：

1. 已有 `file:<path>` tab → `activateTab`
2. 当前 files tab 仍是 `explorer` → `updateTab` 改写成该文件（不新开 tab）
3. 否则 `openTab` 新文件 tab

`openPlugin('files')`：已有 files tab（空探索器或已绑定文件）则激活**第一个**，不新开空 tab；没有才开 `explorer`（`FileIcon` +「文件」）。第一次点文件后该 tab 的 reuseKey 变成 `file:<path>`。终端仍每次新开会话。

改写已有 tab 用 `useExtensionStore.getState().updateTab(id, patch)`，不要为「当前空 tab 绑上文件」再 `openTab`。

## 新增插件

1. 建 `plugins/<id>/`，导出 `ExtensionPlugin`（`open` / `render`，可选 `renderSide` / `onTabClosed`）。
2. 在 [registry.ts](../app/web/src/extensions/registry.ts) 的 `extensionPlugins` 数组追加。欢迎页和「+」菜单只读该数组。

## 宿主 API

```ts
import { useExtensionStore } from '../extensions'

useExtensionStore.getState().openPlugin('files')
useExtensionStore.getState().openTab({ pluginId, title, reuseKey, icon, payload })
useExtensionStore.getState().updateTab(tabId, { title, icon, reuseKey, payload })
useExtensionStore.getState().activateTab(tabId)
useExtensionStore.getState().closeTab(tabId)
useExtensionStore.getState().setEmptyExtensionHandler(() => 'welcome')
```

关到最后一个 tab 时调用 `emptyHandler`，返回：

- `'collapse'`（默认）：清空 tabs 并 `setExtensionOpen(false)`
- `'welcome'`：面板仍开着，显示欢迎页

不要把收起逻辑写进关闭按钮。

## 壳层 UI（本期已定稿）

- 欢迎页：上下左右居中的圆角卡片，列出 registry 插件（现在是 `文件` / `终端`）。单卡 `120×100`，标题 `--fg`，图标 `--fg-3`。悬停时底 `--surface`、边框 `white/12`（和底色分开），标题保持 `--fg`，图标提到 `--fg-2`。栏宽放得下就并排，放不下折成一列，折行后仍居中。
- `+` 添加菜单：`Popover` `bottom-end`、宽 `220px`、内边距 `p-1`；搜索与列表间分割线用 `-mx-1` 左右贴边框（同 `Select` 下拉）。
- 关最后一 tab 默认 `emptyHandler → 'collapse'`（收起右栏）；可改为 `'welcome'` 保持展开并回欢迎页。

## 本期范围

**已完成**：壳层（含 `updateTab`）、文件插件（共享树、空 tab 绑定、类型整名优先、viewer 分发、Monaco 走 `ui/MonacoEditor`）、终端插件。

## 遗留

### 文件（`plugins/files`）

| 项 | 现状 | 后续 |
|---|---|---|
| 探索器主区 | 未选文件时居中 [`EmptyState`](ui.md#emptystate)：`FileIcon` +「请选择要打开的文件」 | 新建、最近文件 |
| 目录树 | 根是当前对话 cwd。顶部一行是目录名，悬停看完整路径，下面直接列子项。根目录列完且没有任何条目时，列表顶部居中「工作目录为空」，无图标。展开才 `list`。`/ws/fs` 的 `change` 只重列已经展开的父目录 | 全局搜索 |
| 文件预览 | 文本进 Monaco，可编辑。停手 400ms 后整文件 `PUT`。还没写完时，tab 标题右侧是 `StatusDot` `normal`（6px）。超过 1 MiB 或二进制只显示一行原因。已打开且没有未保存草稿时，磁盘变化会重新读入；有草稿则提示「磁盘已变化」 | 图片等其它 viewer |
| 类型扩展 | [`matchFileIcon`](../app/web/src/icons/matchFileIcon.ts):父目录/文件名、文件名、从长到短的扩展名、语言 id,否则 unknown。表在 [`fileKinds.ts`](../app/web/src/extensions/plugins/files/fileKinds.ts);`.jsx` 与 `.tsx` 共用 `FileTsxIcon`。待补清单在 [`file-icons.md`](file-icons.md) | 目录名图标;有图后再加 `spec.ts` 等更长扩展名 |
| Header | 左路径面包屑（仅绑定文件时，`PathBreadcrumb`）；右 `FolderIcon` 收起/展开树（展开收起同一图标） | 面包屑可点击跳转目录 |
| 文案 | 空态、过大、二进制、磁盘变化都是中文 | — |

文件树继续自研 `Expandable`，不上第三方树库。

### 终端（`plugins/terminal`）

| 项 | 现状 | 后续 |
|---|---|---|
| 主区 | `@xterm/xterm` + fit；实例按本地 `sessionId` 保活，切 tab 只挪 DOM，关 tab 才 dispose | — |
| 插件顶栏 | `PaneHeader` 38px、`pr-3` 与壳层 toggle 右对齐；左侧只显示当前对话工作区的目录名（`currentExtensionCwd` 的最后一段，不跟 shell 的 `cd`），悬停看完整路径；右 `ListIcon` 16px / 按钮 26 | 左侧可加操作 |
| 会话列表 | 右侧占位 nav，`bg-panel`；宽度 0↔220，终端 fit 剩余宽度；item hover 显示关闭 | — |
| 后端 | WebSocket `/ws/pty`（[ptySocket.ts](../app/web/src/extensions/contracts/adapters/ptySocket.ts)）。新终端的目录是当前对话快照上的 `cwd`（选中会话用那一行的目录，草稿用草稿目录），不退回默认工作区。输入、resize、close 走 `PtyApi`。服务端 id 只用于断线重连 | — |

终端和已打开的文件 tab 按对话记在 `localStorage` 的 `relax.extensions`（见 [web.md](web.md) 的「持久化」）。文件只记路径，不记正文。切到另一条对话时换上那条的终端和文件 tab，不 `closeTab`，所以 xterm 和套接字还在；关的是这个 tab 才释放。刷新后终端按快照里的本地 id 和 `cwd` 重新连接，进程是新的；文件 tab 还在，内容重新从磁盘读。服务端同时最多 16 路，多条对话各留着终端时会顶到这个上限。没有记录就是收起、零个 tab。

关终端 tab 会 `releaseTerminalRuntime` 并发送 `{ type: "close" }`。切换终端 / 切到文件再回来套接字仍开着，缓冲还在。没主动关闭就断开时，12 秒内用服务端 id 重连；`ready.replay` 先清屏再画，比回放缓冲更早的输出不再留在这一屏。shell 退出、路径错误、达到路数上限不再重连，原因写在终端里。

### 契约与宿主

- 文件是 [fsHttp.ts](../app/web/src/extensions/contracts/adapters/fsHttp.ts) 和 [fsWatch.ts](../app/web/src/extensions/contracts/adapters/fsWatch.ts)。终端是 [ptySocket.ts](../app/web/src/extensions/contracts/adapters/ptySocket.ts)。插件只依赖 `FsApi` / `PtyApi`，监听在适配器里。
- 新增插件：registry 登记 + 本文「新增插件」流程；大改后回来删改上表遗留项。
