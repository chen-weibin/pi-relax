# 右侧扩展区（插件）

查阅时机：在 `app/web` 增加扩展插件、改壳层 tab / 欢迎页、改关最后一 tab 的收起策略、接真实文件系统或 PTY、或把 mock 适配器换成后端实现时。

布局外壳（三栏尺寸、`extensionOpen`）见 [web.md](web.md)。原子组件见 [ui.md](ui.md)。

## 结构

```
app/web/src/extensions/
├── types.ts              # ExtensionPlugin / ExtensionTab / 空态策略
├── store.ts              # 壳层 tab；不持久化；含 updateTab
├── registry.ts           # 编译期登记表
├── shell/                # 欢迎页、唯一一层 tab 条、添加菜单
├── contracts/            # FsApi / PtyApi + mock 适配器
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
| 探索器主区 | `RecentsPane` + mock 最近文件 | 接真实 recents / 空态 |
| New File | 按钮占位，无 `FsApi.create` | 契约扩展 `create` 后接入 |
| 目录树 | `FileTree/` + `treeStore`；展开才 `list`；加载中图标槽 `DotMatrix` xs；选中跟当前 tab | 全局搜索、watch 刷新 |
| 文件预览 | `viewers/` 按 `fileKinds.viewer` 分发；本期仅 `monaco` → [`MonacoEditor`](ui.md#monacoeditor) | 图片等其它 viewer |
| 类型扩展 | [`matchFileIcon`](../app/web/src/icons/matchFileIcon.ts):父目录/文件名、文件名、从长到短的扩展名、语言 id,否则 unknown。表在 [`fileKinds.ts`](../app/web/src/extensions/plugins/files/fileKinds.ts);`.jsx` 与 `.tsx` 共用 `FileTsxIcon`。待补清单在 [`file-icons.md`](file-icons.md) | 目录名图标;有图后再加 `spec.ts` 等更长扩展名 |
| Header | 左路径面包屑（仅绑定文件时）；右 `FolderIcon` 收起/展开树（展开收起同一图标） | 面包屑可点击跳转目录 |
| 文案 | 部分英文（`Files, Folders...`、`Recents`、`New File`） | 统一中文或 i18n |

文件树继续自研 `Expandable`，不上第三方树库。

### 终端（`plugins/terminal`）

| 项 | 现状 | 后续 |
|---|---|---|
| 主区 | `@xterm/xterm` + fit；实例按 `sessionId` 保活，切 tab 只挪 DOM，关 tab 才 dispose | 真实 PTY 数据流 |
| 插件顶栏 | `PaneHeader` 38px、`pr-3` 与壳层 toggle 右对齐；右 `ListIcon` 16px / 按钮 26 | 左侧可加 cwd / 操作 |
| 会话列表 | 右侧占位 nav，`bg-panel`；宽度 0↔220，终端 fit 剩余宽度；item hover 显示关闭 | — |
| 后端 | `mockPty.write` 回显（含 Enter / Backspace），无命令执行 | `node-pty` + WebSocket；`write` / `resize` 走 `PtyApi` |

关终端 tab 会 `releaseTerminalRuntime` + `mockPty.dispose`；切换终端 / 切到文件再回来会保留缓冲。换真实适配器时保持此行为。

### 契约与宿主

- 仅 [mock.ts](../app/web/src/extensions/contracts/adapters/mock.ts)；前端只依赖 `FsApi` / `PtyApi` 接口。
- 新增插件：registry 登记 + 本文「新增插件」流程；大改后回来删改上表遗留项。
