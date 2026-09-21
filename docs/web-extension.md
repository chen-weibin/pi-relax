# 右侧扩展区（插件）

查阅时机：在 `app/web` 增加扩展插件、改壳层 tab / 欢迎页、改关最后一 tab 的收起策略、接真实文件系统或 PTY、或把 mock 适配器换成后端实现时。

布局外壳（三栏尺寸、`extensionOpen`）见 [web.md](web.md)。原子组件见 [ui.md](ui.md)。

## 结构

```
app/web/src/extensions/
├── types.ts              # ExtensionPlugin / ExtensionTab / 空态策略
├── store.ts              # 壳层 tab；不持久化
├── registry.ts           # 编译期登记表
├── shell/                # 欢迎页、唯一一层 tab 条、添加菜单
├── contracts/            # FsApi / PtyApi + mock 适配器
└── plugins/files|terminal
```

`components/Extension.tsx` 只 re-export `extensions/shell/Extension`，`App.tsx` 仍挂 `<Extension />`。

## 只有一层壳层 tab

打开文件、打开终端都走 `openTab`。插件不做自己的 tab 条；右侧目录树 /「N Terminals」是 `renderSide` chrome。

壳层 tab 条溢出时：`+` 钉在右侧，条可横向滚动（无滚动条；悬停时滚轮竖滑改成横滑）。**选中 / 新增 / 从右侧会话列表切入** 时，会把当前 tab **完整**滚进可视区，避开右侧 `+` 和渐隐遮罩（半截挡住也要滚到全部露出）。`prefers-reduced-motion` 时不做平滑滚动。

`reuseKey`（与 `pluginId` 一起判重，命中则激活）：

| 场景 | reuseKey |
|---|---|
| 文件探索器 | `explorer` |
| 打开文件 | `file:<path>` |
| 终端会话 | `session:<uuid>` |

## 新增插件

1. 建 `plugins/<id>/`，导出 `ExtensionPlugin`（`open` / `render`，可选 `renderSide` / `onTabClosed`）。
2. 在 [registry.ts](../app/web/src/extensions/registry.ts) 的 `extensionPlugins` 数组追加。欢迎页和「+」菜单只读该数组。

## 宿主 API

```ts
import { useExtensionStore } from '../extensions'

useExtensionStore.getState().openPlugin('files')
useExtensionStore.getState().openTab({ pluginId, title, reuseKey, payload })
useExtensionStore.getState().activateTab(tabId)
useExtensionStore.getState().closeTab(tabId)
useExtensionStore.getState().setEmptyExtensionHandler(() => 'welcome')
```

关到最后一个 tab 时调用 `emptyHandler`，返回：

- `'collapse'`（默认）：清空 tabs 并 `setExtensionOpen(false)`
- `'welcome'`：面板仍开着，显示欢迎页

不要把收起逻辑写进关闭按钮。

## 壳层 UI（本期已定稿）

- 欢迎页：居中列出 registry 插件（`文件` / `终端`）。
- `+` 添加菜单：`Popover` `bottom-end`、宽 `220px`、内边距 `p-1`；搜索与列表间分割线用 `-mx-1` 左右贴边框（同 `Select` 下拉）。
- 关最后一 tab 默认 `emptyHandler → 'collapse'`（收起右栏）；可改为 `'welcome'` 保持展开并回欢迎页。

## 本期范围

**已完成**：壳层（store / registry / 欢迎页 / tab 条 / 添加菜单 / `ShellPanelToggles` 抽出）、`FsApi` / `PtyApi` 契约与 mock 适配器、文件 / 终端插件骨架与 mock 联调。

**未完成（见下节遗留）**：插件真实交互、后端接入、预览与终端渲染。实现时回到本文更新状态。

## 遗留

### 文件（`plugins/files`）

| 项 | 现状 | 后续 |
|---|---|---|
| 探索器主区 | `RecentsPane` + mock 最近文件 | 接真实 recents / 空态 |
| New File | 按钮占位，无 `FsApi.create` | 契约扩展 `create` 后接入 |
| 侧栏树 | `FileTree` + mock `list`，搜索仅过滤树 | 全局搜索、watch 刷新 |
| 文件预览 | `<pre>` 纯文本 | CodeMirror 6 / Monaco；Markdown 复用 `MarkdownView` |
| 面包屑 | 只读展示 | 可点击跳转目录 |
| 文案 | 部分英文（`Files, Folders...`、`Recents`、`New File`） | 统一中文或 i18n |

文件树继续用现有 `Expandable`，不必上 arborist。

### 终端（`plugins/terminal`）

| 项 | 现状 | 后续 |
|---|---|---|
| 主区 | mock 文本输出 + 闪烁块，无输入 | `@xterm/xterm` + `@xterm/addon-fit` |
| 侧栏 | `SessionSwitcher`，英文 `N Terminals` | 文案与交互打磨 |
| 后端 | `mockPty` 定时吐字 | `node-pty` + WebSocket；`write` / `resize` 走 `PtyApi` |

关终端 tab 已调 `dispose`；换真实适配器时保持此行为。

### 契约与宿主

- 仅 [mock.ts](../app/web/src/extensions/contracts/adapters/mock.ts)；前端只依赖 `FsApi` / `PtyApi` 接口。
- 新增插件：registry 登记 + 本文「新增插件」流程；大改后回来删改上表遗留项。
