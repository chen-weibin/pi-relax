# app/web 接入说明

## Tailwind CSS

使用 Tailwind v4,通过官方 `@tailwindcss/vite` 插件接入(Vite 6 + React 19)。

### 当前结构

- `vite.config.ts` — `plugins: [react(), tailwindcss()]`
- `src/index.css` — `@import "tailwindcss"` + 主题 token + 全局基样式
- `src/main.tsx` — `import './index.css'`

### 扩展

在 `src/index.css` 内追加即可,无需新建 `tailwind.config.js`:

| 需求 | 写法 | 参考 |
|---|---|---|
| 自定义设计 token(颜色/字体/间距) | `@theme { --color-brand-500: ...; }` | https://tailwindcss.com/docs/theme |
| 自定义工具类 | `@utility tab-* { ... }` | https://tailwindcss.com/docs/functions-and-directives |
| 容器查询 | `@container`、`@md:grid-cols-3` 等 | https://tailwindcss.com/docs/container-queries |

## 设计系统(Dark Theme)

完整规范见 [`docs/design-system.md`](design-system.md)(Cursor 风格暗色 UI,52 节,含色板/字号/间距/圆角/组件)。本节只记录 `@app/web` 内的接入方式。

### 主题切换

通过 `<html data-theme="...">` 切换。`index.html` 默认 `data-theme="dark"`。

CSS 中通过自定义变体启用 `dark:*` 工具类:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

JS 切换:

```ts
document.documentElement.dataset.theme = 'light' // | 'dark'
```

### 设计 token 接入

所有颜色 token 先定义为 `:root` 上的原生 CSS 变量,再通过 `@theme inline` 暴露给 Tailwind。`inline` 模式下,Tailwind 工具类在运行时读取 CSS 变量,所以主题切换无需重建。

```css
:root,
[data-theme="dark"] {
  --app: #151515;
  --surface: #2b2b2b;
  /* ... */
}

[data-theme="light"] {
  /* TODO: light theme values */
}

@theme inline {
  --color-app: var(--app);
  --color-surface: var(--surface);
  /* ... */
}
```

### 已暴露的 token

来源全部为 `docs/design-system.md` §46。

**色彩 → 工具类**:

| CSS 变量 | Tailwind 类 | 暗色值 | 用途 |
|---|---|---|---|
| `--app` | `bg-app` | `#151515` | 主背景(中 Conversation、右 Extension、Setting 覆盖层) |
| `--sidebar` | `bg-sidebar` | `#252525` | 左 Sidebar,比主背景亮 16 个灰阶 |
| `--panel` | `bg-panel` | `#1C1C1C` | 扩展区侧栏(文件树、终端会话列表),只比主背景亮 7 阶 |
| `--surface` | `bg-surface` | `#2B2B2B` | 浮起表面(设置分组、输入框、滚动条)。Composer 外壳不用它,见下文 |
| `--surface-hover` | `bg-surface-hover` | `#303030` | hover |
| `--surface-active` | `bg-surface-active` | `#353535` | active |
| `--fg` | `text-fg` | `#E5E5E5` | 主文字 |
| `--fg-bright` | `text-fg-bright` | `#F5F5F5` | hover / active 高亮 |
| `--fg-2` | `text-fg-2` | `#C7C7C7` | 次文字 |
| `--fg-3` | `text-fg-3` | `#A1A1A1` | 三级文字 |
| `--fg-disabled` | `text-fg-disabled` | `#737373` | 禁用 |
| `--border` | `border-border` | `#2A2A2A` | 默认边框 |
| `--border-hover` | `border-border-hover` | `#3F3F3F` | hover 边框 |
| `--accent` | `bg-accent` / `text-accent` | `#00C487` | 主交互 / 成功 |
| `--success` | `bg-success` | `#00C487` | 成功 |
| `--error` | `bg-error` | `#F05252` | 错误 |
| `--warning` | `bg-warning` | `#D9A441` | 警告 |
| `--info` | `bg-info` | `#5B9CF6` | 信息 |

**圆角 → 工具类**(§34):`rounded-xs`(4px) / `sm`(6) / `md`(8) / `lg`(10) / `xl`(12) / `pill`(20)。

**字号 → 工具类**(§3.1):`text-xs`(11px) / `sm`(12) / `md`(13) / `base`(14) / `lg`(16) / `xl`(20) / `2xl`(24)。注:这些覆盖 Tailwind 默认值,是项目范围内的统一约定。

**字体**(§3):`font-sans` 用系统字体栈(Inter / SF Pro / PingFang SC / Microsoft YaHei 等);`font-mono` 用系统等宽字体栈。

**间距**:不自定义,沿用 Tailwind 默认 4 倍数刻度(4/8/12/16/20/24/32/40/48px 已覆盖 §46 全部规格)。

### 亮色主题预留

`[data-theme="light"]` 块已在 `src/index.css` 中预留,目前填的是占位值。当前没有切换 UI,所以这些值不会被使用。补齐亮色主题时:

1. 校对 `src/index.css` 中 `[data-theme="light"]` 块的值,逐项对齐 `docs/design-system.md` 中相应字段。
2. 如要新增切换按钮,放 `Appearance` / `General` 区域(参考设计文档 §20-21),通过 `document.documentElement.dataset.theme` 写入。需配合 localStorage 与 `prefers-color-scheme` 决定初始值。
3. 可选:在 `<head>` 内联脚本,在首屏渲染前同步 `data-theme`,避免主题闪烁(FOUC)。

### 踩坑备忘

- v4 是 CSS-first,**不要**新建 `tailwind.config.js` 或 `postcss.config.js`。
- 内容扫描自动,无需手写 `content` 字段。
- 不要用字符串拼接构造 class(如 `` `bg-${color}-500` ``),Tailwind 无法识别。
- 颜色 token 走 `@theme inline` 而不是 `@theme`,否则变量在构建时凝固,无法响应 `[data-theme="light"]` 切换。
- 自定义 `text-base` / `text-lg` / `text-xl` / `text-2xl` 会覆盖 Tailwind 默认值,这是项目级约定。

### 滚动条变体(`styles/scrollbar.css`)

全局滚动条样式写在 `src/index.css`(thumb 用 `--surface`,hover 用 `--surface-hover`)。当容器背景比全局默认场景**更浅**(例如 Sidebar 的 `--sidebar`),全局的 thumb 反而显得比背景**还深**,在浅底上看不出滚动条。需要把 thumb 往背景方向微调一档,让它在浅底上自然浮现,但仍比 hover 高亮更弱。

新增 `src/styles/scrollbar.css`,集中存放所有"非全局默认"的滚动条变体。**不会**污染 `index.css` 中的全局样式。

**命名约定**(按 thumb 与全局的深浅层级,用 `color-mix` 在 `--surface` 基础上微调):

| class | thumb | 适用 |
|---|---|---|
| `.scrollbar-deep` | `color-mix(--surface, black 40%)`(更深一档) | 比 `--surface` 更深的背景(留位) |
| `.scrollbar-shallow` | `color-mix(--surface, white 5%)`(更浅一档) | 比 `--surface` 更浅的背景,例如 Sidebar |
| `.scrollbar-none` | 完全隐藏(`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) | 浮层 / 下拉 / 抽屉等自带视觉容器的场景,不要滚动条抢戏 |

**不抖动 + hover 才显形(本文件全部变体的默认行为)**:

- `overflow-y: overlay`(Chrome/Safari):滚动条叠加在内容之上,不占布局空间 → 内容宽度不变,无 layout shift。Firefox 不识别 `overlay`,整条声明作废,所以下面紧跟 `overflow-y: auto` 作为 fallback,避免 Firefox 上滚动功能失效。
- `scrollbar-gutter: stable`:永远预留滚动条槽位宽度,即使 `overlay` 在 Chrome 上生效,gutter 也强制占用 → 内容区宽度始终是 `容器宽 - gutter`,不会因滚动条出现/消失而抖动。
- thumb 默认 `transparent`,仅当容器带 `--hover` modifier 时显形。`--hover` 由 consumer 通过 `onMouseEnter`/`onMouseLeave` 切换 — 纯 CSS `parent:hover::-webkit-scrollbar-thumb` 不可靠(webkit 伪元素不参与 DOM 事件传播)。

参考: [SegmentFault](https://segmentfault.com/a/1190000017044563)、[张鑫旭](https://www.zhangxinxu.com/wordpress/2015/01/css-page-scrollbar-toggle-center-no-jumping/)。

**用法**:consumer 在自己的 `.tsx` 顶部 `import '../styles/scrollbar.css'`,把对应 class 加到滚动容器上,并用 React state 切 `--hover` modifier。例:`Sidebar.tsx` 在 `ProjectSection` 的滚动容器上加 `scrollbar-shallow` + `scrollbar-shallow--hover`(后者由 `useState` 在 `mouseenter`/`mouseleave` 时切换)。

新增变体直接在 `styles/scrollbar.css` 内追加,不要往 `index.css` 写 — 保持全局样式的纯净。

## UI 组件库(`ui/`)

`app/web/src/ui/` 是项目的 UI 组件库目录,业务无关、可在多处复用。对内封装第三方库,对上提供与领域词无关的原子组件。

> 组件的「何时用 / 何时不用 / API / 视觉 / 踩坑」全部在 [`docs/ui.md`](ui.md)。本文档只覆盖 `app/web` 接入层(Tailwind、token、布局、四区 shell、Composer 等领域外壳)。

### 何时放进 `ui/`

满足以下**全部**条件:

- **业务无关**:不引用 `Sidebar` / `Conversation` / `Setting` 等任何领域组件,不放领域状态/领域类型。
- **可复用**:在 app shell 之外(未来的二级页、Modal、设置面板、扩展插件等)有复用场景,或对一组第三方 API 做了项目风格的统一封装。
- **稳定**:API 已收敛,有明确的 props 契约和默认行为。

不满足的 → 放 `components/`(领域组件)或 `hooks/`(逻辑复用)。

### 命名 & 文件

- 文件名与导出组件名一致;单文件单组件(`ui/Foo.tsx`),或同名目录 `Foo/index.tsx`(有独立样式时再配 `index.css`,如 `MarkdownView/`、`MessageSurface/`、`Editor/`)。
- props 类型用 `export type {Name}Props`,便于其他模块显式引用。
- 不依赖 `components/`、`hooks/` 里任何领域代码;如有需要,通过 props 注入。

### 当前组件(指针)

| 组件 | 一句话 | 详细 |
|---|---|---|
| `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle` | 可拖布局三件套,封装 `react-resizable-panels` | [`ui.md#resizablepanels`](ui.md#resizablepanels) |
| `PaneHeader` | 子面板顶栏(38px + 底部分割线,左右 slot) | [`ui.md#paneheader`](ui.md#paneheader) |
| `Button` | 文字按钮:变体、随尺寸变化的圆角、neutral / inverse、整行、前后图标、loading | [`ui.md#button`](ui.md#button) |
| `IconButton` | 图标按钮,统一变体 / 尺寸 / 禁用态;`title` 走 Tooltip | [`ui.md#iconbutton`](ui.md#iconbutton) |
| `Segmented` | 分段控件:胶囊滑动指示、三档尺寸、default / inverse 两种样式 | [`ui.md#segmented`](ui.md#segmented) |
| `Input` | 单行文本框:尺寸、清空、前后缀、框内字数、状态与框下提示 | [`ui.md#input`](ui.md#input) |
| `Tooltip` | 短 hover 提示,包在 Popover 上 | [`ui.md#tooltip`](ui.md#tooltip) |
| `Popover` | 浮层 / 菜单,封装 `@floating-ui/react` | [`ui.md#popover`](ui.md#popover) |
| `Dropdown` | 带子菜单的菜单,行尾当前值,子面板可搜索 | [`ui.md#dropdown`](ui.md#dropdown) |
| `ContextMenu` | 右键菜单,从点击点向右下展开,靠边翻转;面板与 Dropdown 相同 | [`ui.md#contextmenu`](ui.md#contextmenu) |
| `Modal` | 遮罩对话框壳,居中或距顶;内容自定义 | [`ui.md#modal`](ui.md#modal) |
| `Dialog` | 标题、正文和右下角按钮;异步回调结束才关 | [`ui.md#dialog`](ui.md#dialog) |
| `Spinner` | 圆锥渐变转圈,大小和颜色可改 | [`ui.md#spinner`](ui.md#spinner) |
| `Message` | 顶部居中短消息:彩色图标块 + 单行文字,默认 2 秒自动消失 | [`ui.md#message`](ui.md#message) |
| `SwipeToast` | 可下滑关闭的浮层提示:倒计时引信、甩动关闭、可撤销 | [`ui.md#swipetoast`](ui.md#swipetoast) |
| `Editor` | ProseMirror 智能输入框 | [`ui.md#editor`](ui.md#editor) |
| `MonacoEditor` | Monaco 代码/文本编辑器,主题走 CSS token | [`ui.md#monacoeditor`](ui.md#monacoeditor) |
| `MarkdownView` | `streamdown` Markdown 渲染(static / streaming) | [`ui.md#markdownview`](ui.md#markdownview) |
| `Heading` | 标题:级别即字号、token 色、行高、整行或省略、溢出 Tooltip | [`ui.md#heading`](ui.md#heading) |
| `Paragraph` | 正文:三种字号、token 色、行高、换行或省略、溢出 Tooltip | [`ui.md#paragraph`](ui.md#paragraph) |
| `Hint` | 辅助说明:12px、默认三级文字色,其余同 Paragraph | [`ui.md#hint`](ui.md#hint) |
| `EmptyState` | 空区域占位:可选图标,居中或贴顶 | [`ui.md#emptystate`](ui.md#emptystate) |
| `TypewriterText` | rAF grapheme 逐字打字机 | [`ui.md#typewritertext`](ui.md#typewritertext) |
| `ShinyText` | `motion/react` 渐变扫光文字 | [`ui.md#shinytext`](ui.md#shinytext) |
| `DisclosureRow` | 标题 + chevron + 展开收起;标题可扫光 | [`ui.md#disclosurerow`](ui.md#disclosurerow) |
| `Expandable` | 高度过渡的展开/收起容器(纯展示,无 header) | [`ui.md#expandable`](ui.md#expandable) |
| `MessageSurface` | 轻量卡片外壳,无角色语义 | [`ui.md#messagesurface`](ui.md#messagesurface) |
| `DotMatrix` | 点阵 loading(9/16 点,乱中有序 / 顺时针两种节奏) | [`ui.md#dotmatrix`](ui.md#dotmatrix) |
| `StatusDot` | 6px 单点状态指示(success / failure / normal) | [`ui.md#statusdot`](ui.md#statusdot) |
| `ProgressBar` | 水平拖拽滑块 + 数值槽位(thumb / track / 键盘 / pointer capture) | [`ui.md#progressbar`](ui.md#progressbar) |
| `GlassIcons` | 液态玻璃图标组:WebGL 折射 + 视差 + 悬停动作,无 WebGL 自动降级 | [`ui.md#glassicons`](ui.md#glassicons) |

> 用谁 / 别造轮子 → [`docs/ui.md` 决策表](ui.md#决策表该用哪个) + [反例表](ui.md#反例这些事不要做)。

### 新增 UI 组件的流程

1. 在 [`docs/design-system.md`](design-system.md) 或对应规范里先有该组件的设计/交互定义。
2. 在 `ui/` 下新建文件,导出 `{Name}` 与 `{Name}Props`。
3. 若包装第三方库,类型从该库导出;不要二次发明同名 prop。
4. 在使用方引入并实测一个具体场景(至少 typecheck + 浏览器手测)。
5. 同步更新 [`docs/ui.md`](ui.md) 的组件小节 + 本节指针表;不要留单边。

### Editor / Composer / Popover

> 完整 API 与使用场景见 [`docs/ui.md`](ui.md) 对应小节。本节仅留接入要点(因为 `Editor` / `Composer` / `Popover` 与 app shell 的接入层紧密相关):

- **`Editor`**:见 [`ui.md#editor`](ui.md#editor)。对话输入的外壳 `Composer` 见下文。
- **`Composer`**:领域组件 [`src/components/Composer.tsx`](../app/web/src/components/Composer.tsx),包装 `Editor` + 右下发送。不含消息列表 / agent 逻辑。

  **API**:

  ```tsx
  <Composer
    placeholder="发送消息…"
    disabled={false}
    onSubmit={(text) => { /* trim 后非空;内部会 clear + focus */ }}
  />
  ```

  **视觉**:

  | 项 | 值 |
  |---|---|
  | 外壳 | `color-mix(--app 45%, --surface)`(暗色约 `#212121`,比 `--surface` 深) + `rounded-pill` + `border-border-hover` |
  | 聚焦边框 | `color-mix(--border-hover, --fg 12%)`,只比默认亮一档 |
  | 发送 | 右下 28px 圆钮;可发送 `bg-fg text-app`,空内容 `bg-surface-active text-fg-disabled`。生成中且输入为空时换成同尺寸方块,点击停止 |
  | 图标 | 复用 `SendIcon`(与侧栏「新对话」同一 glyph),视觉居中用 `-translate-x-[0.5px]` |

  Enter 与点发送走同一 `onSubmit`。底栏右侧、发送钮左边是模型和思考强度,见 [web-app.md](web-app.md) 模块 6。附件本轮未做。

- **`Popover`**:见 [`ui.md#popover`](ui.md#popover)。

### Conversation(v1)

对话区渲染的分层、数据模型、runtime、滚动/打字机约定、历史替换与实时事件边界,见 [`docs/web-conversation.md`](web-conversation.md)(改对话列表、块类型、贴底滚动、打字机,或接历史 / 实时事件时查阅)。会话列表、发送、全局 SSE、历史回放和前端性能边界见 [`docs/web-app.md`](web-app.md)(接真实会话或改帧通知、Markdown 节流、Worker 时查阅)。打磨消息卡片 / 思考折叠 / Markdown / 打字机观感时也先看 [`web-conversation.md`](web-conversation.md) 的「打磨 UI」节,再改 `ui/` 或 `components/conversation/`。本节只记接入点。

有消息时，消息列与 Composer 共用 `max-w-[800px]` + `px-4`，Composer 贴底。没有可画的消息（未选中、新对话、空历史）时 Composer 在对话区垂直居中，边框盒子用 `min(620px, calc(100% - 2rem))`，宽屏最大 620，更窄时两侧留 1rem。从居中落到贴底（以及反向）用 `motion/react` 的 `layout`，约 0.4s。加载另一条会话时保持加载前的位置，避免空列把输入框弹回中间。列贴底用 [`use-stick-to-bottom`](https://www.npmjs.com/package/use-stick-to-bottom)（`StickToBottom`。打开历史和流式增高是 `instant`；新的一条用户消息用弹簧滚上去，见 [`web-conversation.md`](web-conversation.md) 的「滚动与流式出现」）。Streamdown `animated` 只管文字出现，不管列表滚动；代码块内部滚动仍由 `isAnimating` + MarkdownView 外壳 max-height 处理。数据层在 [`src/conversation/`](../app/web/src/conversation/)(类型 + runtime,不是 UI);组装与渲染在 [`components/conversation/`](../app/web/src/components/conversation/)。选中会话后正文来自 history，见 [`web-app.md`](web-app.md) 模块 3。

思考块(历史与流式同一套):默认收起,随时可展开/收起;箭头用 `DisclosureRow` 的 `chevron="hover"`(收起时只有悬停才显示,展开后常显,再收起且指针不在行上时立刻消失);流式时标题走 `ShinyText` 扫光(`blinking`);展开后正文用 `MarkdownView` 的 `markdown-view--dim`(`--fg-disabled` 混 28% `--fg-3`,比纯禁用色略亮,仍暗于标题),`mode='streaming'` 让未闭合语法被自动修补。`isAnimating={open && streaming}` 跟原打字机 `playing` 语义对齐。这三个组件的「何时用 / 何时不用 / 视觉细节」分别在 [`docs/ui.md` 对应小节](ui.md)。连续的思考和工具收成「探索」,当前在做什么用活动行;助手失败浮在输入框上。分组和活动行见 [`web-conversation.md`](web-conversation.md),接入见 [`web-app.md`](web-app.md) 模块 7。

streamdown 与插件的 Tailwind 类扫描写在 [`ui/MarkdownView/index.css`](../app/web/src/ui/MarkdownView/index.css) 的 `@source`,由 `src/index.css` `@import` 进来;否则内部工具类不会生成。

## 图标(`icons/`)

`app/web/src/icons/` 存放项目自绘的 SVG 图标组件,统一以 `*Icon` 命名导出。默认颜色走 `currentColor`,适配外层 `text-*` 工具类。

目前两种风格:

| 风格 | 根属性 | 适用 | 现有图标 |
|---|---|---|---|
| 实心单色 | `width=14 height=14 viewBox="<shape-bbox>" fill="currentColor"` | 来源是第三方/参考 SVG 的填充字形 | `PanelLeftIcon` / `PanelRightIcon` / `SendIcon` / `SearchIcon` / `BlocksIcon` / `SettingsIcon` / `ChevronRightIcon` / `FolderClosedIcon` / `FolderOpenIcon` / `FolderIcon` / `AddFolderIcon` / `FilterIcon` / `PlusIcon` / `FileIcon` / `TerminalIcon` / `CloseIcon` / `MinusIcon` / `TrashIcon` / `RenameIcon` / `RemoveProjectIcon` / `ListIcon` |
| 彩色文件类型 | `width=14 height=14`,path 写死 `fill` hex | 扩展名图标,多色不能吃 `currentColor` | [`fileTypes.tsx`](../app/web/src/icons/fileTypes.tsx): `FileMarkdownIcon` / `FileReadmeIcon` / `FileChangelogIcon` / `FileLicenseIcon` / `FileAgentsIcon` / `FileTxtIcon` / `FileJsIcon` / `FileJsTestIcon` / `FileTsIcon` / `FileTsTestIcon` / `FileTsxIcon` / `FileTsxTestIcon` / `FileViteIcon` / `FileCssIcon` / `FileScssIcon` / `FileLessIcon` / `FileHtmlIcon` / `FileXmlIcon` / `FileVueIcon` / `FileSvelteIcon` / `FileJsonIcon` / `FilePackageJsonIcon` / `FileLockIcon` / `FileYamlIcon` / `FileTomlIcon` / `FileSvgIcon` / `FileImageIcon` / `FileShellIcon` / `FilePythonIcon` / `FileGoIcon` / `FileRustIcon` / `FilePhpIcon` / `FileJavaIcon` / `FileHIcon` / `FileCIcon` / `FileCppIcon` / `FileRubyIcon` / `FileSqlIcon` / `FileGraphqlIcon` / `FilePrismaIcon` / `FileWasmIcon` / `FilePdfIcon` / `FileZipIcon` / `FileFontIcon` / `FileVideoIcon` / `FileAudioIcon` / `FileGitIcon` / `FileEnvIcon` / `FileTsconfigIcon` / `FileEslintIcon` / `FileDockerIcon` / `FileUnknownIcon` |

实心单色图标的关键:**`viewBox` 设成 path 实际可见形状的 bounding box**(不是固定的 `0 0 1024 1024`)。原因:不同来源 SVG 的 path 占据的 bbox 大小差异很大(如一个纸飞机可能只占 viewBox 的 70%,一个 Blocks 网格占 85%),直接用源 viewBox 会导致渲染出来大小不一致。按 bbox 裁切后每个图标都充满 14×14 渲染区,视觉大小一致。bbox 之外留约 3% 内边距(在 viewBox 内侧加 padding),避免图形贴边。

新增单色图标:在 `index.tsx` 内追加 `export function NameIcon()`,根属性按上表选实心单色;颜色走 `currentColor`,不要写死 hex。

新增文件类型彩色图标:写在 `fileTypes.tsx`,从 `index.tsx` re-export;保留源 SVG 的多 path `fill`。源图贴满 `1024` 画布、看起来比旁边图标大时,加大 viewBox 留白,图形仍居中(如 `FileJsonIcon` / `FilePackageJsonIcon`)。全部彩色文件图标留在这一个模块里静态引用,不按类型拆包,也不在目录树每一行里动态加载。

文件图标匹配在 [`matchFileIcon.ts`](../app/web/src/icons/matchFileIcon.ts),不依赖具体组件,别处传入自己的关联表即可。顺序:带父目录的文件名、文件名、从长到短的扩展名(每一段先看带父目录的键)、语言 id,最后默认文件图标。目录名是另一条:带父目录的目录名、目录名、默认目录图标。键不区分大小写。文件插件的表在 [`fileKinds.ts`](../app/web/src/extensions/plugins/files/fileKinds.ts),把扩展名绑到图标和 Monaco 高亮语言;没有对应项时用 `FileUnknownIcon`，并且不读正文。哪些能打开见 [`web-fs.md`](web-fs.md)（改支持的类型时查阅）。`.jsx` 与 `.tsx` 共用 `FileTsxIcon`,Monaco 分别用 `javascript` 和 `typescript`。文件名是 `.env` 或以 `.env.` 开头时用 `FileEnvIcon`,不进扩展名表。补一种图标:组件加在 `fileTypes.tsx`,再在 `fileKinds` 加一条 `names` 或 `extensions`。哪些已经有、哪些还是兜底,见 [`file-icons.md`](file-icons.md)(按清单补图时查阅)。

## 路由

`main.tsx` 在 `StrictMode` 里挂 `BrowserRouter`，里面渲染 `App`。`App` 用 `useRoutes(routes)` 挂路由表，外包一层 `Suspense`（`fallback={null}`，`body` 背景已是 `--app`）。路由表在 [`app/web/src/router/index.tsx`](../app/web/src/router/index.tsx)。

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | `pages/Workspace` | 现有四区壳。`startSessionTransport()` 在这里启动 |
| `/ui` | `pages/Ui` | 只在 `import.meta.env.DEV` 注册。左侧目录宽固定 220px，可收起，默认展开，不拖拽、不写入本地存储；收起时分隔线一起去掉，主列顶栏的按钮再展开。按操作 / 浮层 / 反馈 / 布局 / 文本分组。当前节底色只包住文字；同一节有多项时只高亮离标题最近的一项。滚动条隐藏。右侧内容居中，每个组件一块圆角描边预览，组件之间一条与内容同宽的分隔线。点目录平滑滚到对应节。说明和演示在 `src/uidoc/`，页面不贴源码。`vite build` 不包含这条路由 |
| `/chat` | `pages/Chat` | 只在 `import.meta.env.DEV` 注册。流式渲染试验页。左侧会话栏固定 220px，可收起，默认展开；右侧节奏栏固定 240px，可收起，默认收起。两颗按钮都留在主区顶栏，不拖拽、不写入本地存储。侧栏只列默认工作区的会话；导入的模拟留在侧栏顶部，页面不刷新就能再点开重放。新建、录制、导出、模拟在主区顶栏左侧。对话视图在 `src/chat/`。露出节奏和正式对话共用 `defaultFeed`，右侧改动只影响这一页。可录制一轮原始 SSE、导出 JSON，再按到达间隔回放。`vite build`（含 `--mode test`）不包含这条路由 |
| 其他 | — | `<Navigate to="/" replace />` |

`Workspace` 用 `React.lazy` 动态 `import`，Vite 拆 chunk。`/ui` 和 `/chat` 的 `lazy` 都写在 `if (import.meta.env.DEV)` 里，生产构建和 `vite build --mode test` 把这些分支裁掉。路由级组件放 `src/pages/`，不要放进 `src/ui/`（那是组件库）。陈列页的文案和多种形态放 `src/uidoc/`，不要堆进 `pages/Ui.tsx`。`/chat` 的试验渲染放 `src/chat/`，确认观感后再迁回 `components/conversation/`。

`mainView`（对话 / 自定义）仍是壳内状态，不进 URL。

## 布局

四区壳在 [`pages/Workspace.tsx`](../app/web/src/pages/Workspace.tsx)。由两层嵌套的 `react-resizable-panels` Group 组成:外层 `[Sidebar | main]`,内层(挂在 `main` Panel 内)`[content | Extension]`。`content` 承载 `<MainContainer />`,内部根据 `mainView` state 决定渲染 `<Conversation />` 或 `<CustomizeView />`(未来会更多)。这样拖 `Sidebar | main` 的分隔条不会影响 content/Extension 的内部比例,反之亦然。

### 树结构

```
<div.h-screen.w-screen>
  <Group id="app-shell" orientation="horizontal">     ← 外层
    [optional] <Panel id="sidebar"/>                 ← sidebarOpen=true
    [optional] <Separator/>
    <Panel id="main">                                ← 永远存在
      <Group id="main-area" orientation="horizontal"> ← 内层
        <Panel id="content"/>                        ← 挂 MainContainer
        [optional] <Separator/>                       ← extensionOpen=true
        [optional] <Panel id="extension"/>
      </Group>
    </Panel>
  </Group>
</div>
```

### 目录

```
src/
├── main.tsx                      # BrowserRouter，里面渲染 App
├── App.tsx                       # useRoutes(routes)；Suspense fallback 为空
├── router/index.tsx              # 路由表：/ ；开发环境另有 /ui ，其余重定向到 /
├── pages/
│   ├── Workspace.tsx             # 四区壳；shell 状态从 common store 切片读取
│   └── Ui.tsx                    # 开发环境陈列页壳：左侧目录 + 右侧分节
├── uidoc/                        # /ui 的说明和演示，仅开发构建引用
├── conversation/                 # 会话数据层:类型 + createBlockRuntime(详见 docs/web-conversation.md)
├── hooks/
│   ├── usePersistedPanelLayout.ts # 面板宽度读写 store/local.ts，不直接碰 localStorage
│   ├── useModal.tsx             # 打开 Dialog。confirm 传 onOk / onCancel
│   └── useToast.tsx             # 打开 SwipeToast。show 弹一条，可叠多条；holder 挂一次
├── store/                        # 全局状态(详见下文 "状态管理 (store/)" 小节)
│   ├── index.ts                 #   统一 re-export
│   ├── common.ts                #   common store:shell 状态(toggles + mainView)
│   └── local.ts                 #   local store:面板宽度、项目收起;key `relax`
├── ui/                           # 业务无关的可复用 UI 组件(详见上文 "UI 组件库" 小节)
│   ├── ResizablePanelGroup.tsx
│   ├── ResizablePanel.tsx
│   ├── ResizableHandle.tsx
│   ├── IconButton.tsx
│   ├── PaneHeader.tsx            # 子面板顶栏(38px + 底部分割线)
│   ├── EmptyState.tsx            # 空区域占位(可选图标,居中或贴顶)
│   ├── Popover.tsx
│   ├── Modal.tsx                 # 遮罩对话框壳,与 Popover 并列
│   ├── Dialog.tsx                # 标题、正文和确认按钮,包在 Modal 上
│   ├── Spinner/                  # 圆锥渐变转圈;index.tsx + index.css
│   ├── Tooltip.tsx               # 短 hover 提示,包在 Popover 上
│   ├── MarkdownView/             # streamdown 封装(static / streaming);index.tsx + index.css
│   ├── TypewriterText.tsx        # grapheme 增量打字机
│   ├── DisclosureRow.tsx         # 折叠行 + 标题 blink
│   ├── MessageSurface/           # 轻量 Surface 卡片外壳(无角色语义);index.tsx + index.css
│   ├── Editor/                   # ProseMirror 智能输入框(paragraph + text)
│   └── MonacoEditor/             # monaco-editor 封装(worker + Shiki aurora-x)
├── extensions/                   # 右侧扩展区：插件注册、壳层 tab、Fs/Pty 契约（详见 docs/web-extension.md）
│   ├── types.ts
│   ├── store.ts                  #   壳层 tabs；终端快照按对话写入 local store
│   ├── registry.ts               #   编译期插件表
│   ├── shell/                    #   欢迎页 + 唯一 tab 条 + 添加菜单
│   ├── contracts/                #   FsApi / PtyApi；文件 HTTP + /ws/fs，终端 /ws/pty
│   └── plugins/                  #   files / terminal
├── icons/                       # 自绘 SVG 图标(详见上文 "图标 (icons/)" 小节)
│   └── index.tsx
├── components/
    ├── Sidebar.tsx               # 左,可被外层 Group 收起(整 Panel 移除);从 store 读 mainView
    ├── SidebarActions.tsx        # Sidebar 顶部三个 action 按钮(新对话/搜索/自定义)
    ├── ProjectSection.tsx        # Sidebar 中部"项目"区块(标题行 + 项目列表)
    ├── ProjectSectionHeader.tsx  # "项目"区块标题行:标题 + hover-only chevron + 过滤 + 添加项目
    ├── ProjectItem.tsx           # 单个项目行:folder/chevron icon + 名称 + hover-only +;展开后渲染 SessionItem 列表
    ├── SessionItem.tsx           # 单个会话行:标题 + 相对时间
    ├── MainContainer.tsx         # 中,内层 content Panel 容器;顶部挂 MainHeader + 按 mainView 渲染 view
    ├── MainHeader.tsx            # MainContainer 顶部统一 header(高 36px,无 border/bg;对话视图左侧为选中会话标题,右侧并排放 sidebar / extension toggle)
    ├── Composer.tsx              # 对话输入外壳(Editor + 右下发送)
    ├── conversation/             # 对话 UI: Conversation 组装 + ConversationView + kind 渲染器
    ├── CustomizeView.tsx         # view: 自定义内容(占位)
    ├── Extension.tsx             # re-export extensions/shell/Extension；右栏可被内层 Group 收起
    ├── Setting.tsx               # 全屏 fixed inset-0 z-50 覆盖层
    └── UserBar.tsx               # 用户信息条(头像 + 用户名 + 设置入口),固定高 48px,可在 Sidebar / Setting 左下复用
└── utils/
    └── relativeTime.ts           # formatRelativeTime(ms) — "Nm" / "Nh" / "Nd" / "Nw" / "Ny"
```

### 区段尺寸

| 区 | `defaultSize` | `minSize` | `maxSize` | `groupResizeBehavior` | 所在 Group |
|---|---|---|---|---|---|
| Sidebar | `260`px | 200px | 400px | `preserve-pixel-size` | 外层 |
| main | 剩余空间 | 630px(= 320 + 300 + 分隔条) | — | (默认) | 外层 |
| content(MainContainer) | 剩余空间(无 `defaultSize`) | 320px | — | (默认) | 内层 |
| Extension | `540`px | 300px | — | `preserve-pixel-size` | 内层 |
| Setting | `fixed inset-0` | — | — | — | 全屏覆盖 |

**设计意图:**

- `content` Panel 不写 `defaultSize`,library 自动把内层剩余空间全部分给它 — 主展示区总是尽可能宽。
- `Extension` 用绝对值 `540`px + `preserve-pixel-size`,外层 Group 整体宽度变化时,先保住 Extension 的像素宽度,多出的空间让给其他可伸缩面板。适合"右侧固定宽度"的场景。
- `main` 的 `minSize={630}` 保证内层 content(320) + ext(300) + 分隔条不会把空间压到不可用。
- `Sidebar` 用 `preserve-pixel-size`:窗口缩放时先保住左侧像素宽度,多出或少掉的空间让给右侧 `main`。拖分隔条仍可在 200–400px 之间改宽度;窗口缩到 `main` 的 `minSize` 顶住后,侧边栏才会被迫变窄。
- `Sidebar` 的 `maxSize={400}` 防止拖太宽挤掉主展示区。

### 收起/展开

`{ sidebarOpen: boolean; extensionOpen: boolean }` 状态由 common store 持有(`src/store/common.ts`)。`sidebarOpen` 不持久化，每次启动默认展开。`extensionOpen` 是当前这一份的开关：选中对话后跟那条的终端快照走，还没选中时默认收起。`pages/Workspace.tsx` 切片订阅这两个字段,值翻转时整棵子树重新渲染并决定 Panel 是否挂载。

收起 = 整 Panel 从所属 Group 中移除(`{sidebarOpen && <Panel/>}` 模式),不是 `collapsedSize:0`。这样展开时回到原记录的宽度。

右侧 Extension **内容**(欢迎页、壳层 tab、files/terminal 插件)见 [`docs/web-extension.md`](web-extension.md)。关到最后一个 tab 时默认也会 `setExtensionOpen(false)`(策略可替换)。

`MainContainer` 顶部挂一个统一的 `<MainHeader />`(高 36px,无 border/bg,与主区域共享 `--app` 背景)。对话视图下,左侧是当前选中会话或草稿的标题,与侧栏同一套 `sessionTitle` / 「新对话」;短标题只占文字宽度,最长 20rem,窗口更窄时按左侧剩余宽度省略,悬停可见全文。其它视图左侧不显示。右侧并排 `IconButton` + `PanelLeftIcon` toggle sidebar、`IconButton` + `PanelRightIcon` toggle extension(顺序不变),按钮标题反映当前状态(`收起 / 展开左侧栏` 等)。右侧栏展开时这两颗按钮改挂到扩展区顶栏,主区顶栏只留标题。各 view 不再自带 header,只渲染占位主体。

### MainContainer(view 切换)

中区内层 Panel id 叫 `content`,挂的是 `<MainContainer />`,**不直接挂**某个具体 view。`mainView: 'conversation' | 'customize'`(目前两个,后续可能扩展)由 common store 持有,**不持久化**,默认 `'conversation'`。`MainContainer` 切片订阅 `mainView`,无 props,渲染结构为「统一 `<MainHeader />` + 当前 view」(`view === 'customize'` 走 `<CustomizeView />`,其它走 `<Conversation />`)。`MainContainer` 外层 `flex h-full w-full flex-col bg-app text-fg-3 text-sm` 提供整区背景与基础文字色,header 与 view 共享,view 内部不再重复声明。

切换流程:

1. 用户点「新对话」→ `openDraftForCurrentProject`：在当前选中会话所在项目（没有选中则默认工作区）放一条内存草稿，并把 `mainView` 设为 `'conversation'`。点「自定义」仍直接 `setMainView`。
2. common store 更新 `mainView`
3. `MainContainer` 重新渲染对应 view 组件(`view === 'customize'` 走 `<CustomizeView />`,其它走 `<Conversation />`)
4. `Sidebar` 内 `SidebarActions` 的 `activeKey` 同步反映当前 view(view→key 映射:'conversation'→'newChat'、'customize'→'customize';`search` 永远不 active)

新增 view 的步骤:在 `MainView` 类型加成员 + `MainContainer` 的 `if/else` 加分支 + `Sidebar.tsx` 的 `viewFromActionKey` / `actionKeyFromView` 加映射 + 新建 view 文件 + SidebarActions 加 action。`mainView` 切换不走 URL，也不另做一份注册表。新的整页走上面的路由表。

### 持久化

界面状态进 `store/local.ts` 的 `useLocalStore`。只有这个文件调用 `localStorage`，key 是 `relax`。模块加载时同步读入，作为 store 初值；action 改完后写回整份文档。不用 zustand `persist`（注水是异步的，首帧会先用默认值）。

```ts
{
  version: 1,
  layout: Record<string, unknown>, // groupId → 该组的 layout 对象
  projectsCollapsed: string[]       // 收起的项目 id；不在表里 = 展开
  extensions: Record<string, ExtensionSnapshot> // 对话 id 或 draft:cwd → 终端和已打开文件
}
```

- 没有 key、JSON 坏了、`version` 不是 1、或 `localStorage` 不可用：空 layout、空收起名单、空终端快照。写失败（配额、隐私模式）忽略，内存里的状态继续用。
- 旧 key `app-shell:layout:app-shell` 和 `app-shell:layout:main-area` 已废弃。不读、不搬、不删。
- `usePersistedPanelLayout` 只通过 store 读写宽度。外层 group `app-shell` 是 `[sidebar, main]`，内层 `main-area` 是 `[content, extension]`。
- 侧栏每个项目的收起写在 `projectsCollapsed`。没有记录默认展开，并且只有展开的项目才拉该项目的会话。`ProjectSection` 订阅这份名单。
- `extensions` 记下这条对话的目录、右侧栏开没开、终端和已打开的文件 tab，以及当前是哪一个。文件只记路径，不记正文。键是会话 id，没发送前是 `draft:${cwd}`。第一次发送成功后改挂到新会话 id。切对话时按原顺序换上对应快照，已经连着的终端进程先留着。没有记录就是收起、零个 tab。刷新后文件 tab 还在，内容重新从磁盘读。

以后要记住的界面状态加到这个 store 的字段里，不要再直接写 `localStorage`。

**侧栏开关不进这份文档。** `sidebarOpen` / `mainView` / `settingOpen` 仍由 common store 持有，每次启动 sidebar 展开、`mainView='conversation'`、`settingOpen=false`。当前对话的右侧栏开没开写在 `extensions`；还没选中对话时 common store 的 `extensionOpen` 仍是收起。「项目」标题那一行的整块折叠也只活在组件里。

Setting 由 `settingOpen` 控制显隐(`{settingOpen && <Setting />}`),在 `pages/Workspace.tsx` 内挂载。Setting `z-50`,在四区上方全屏渲染。

### 项目区块(ProjectSection)

`Sidebar` 中部 `flex-1 overflow-y-auto` 容器内嵌 `ProjectSection`,结构自上而下:

```
ProjectSection
├── ProjectSectionHeader    "项目" 标题行(sticky top-0 + bg-sidebar,列表滚动时固定在顶)
│   ├── "项目" + hover-only chevron(10×10,文字右侧,fold/unfold 整块)
│   └── filter + add-folder(IconButton size=md,始终可见,pr-1 gap-0.5)
└── ProjectItem[]           每个项目一行(在可滚动区域内)
    ├── folder / chevron    (folder 14×14 默认;hover 时切 chevron 10×10,展开时 rotate-90)
    ├── name
    ├── hover-only + 按钮    (10×10 plus,absolute right-2.5,与 session 时间右边缘对齐)
    └── SessionItem[]       展开后才渲染,无动画
```

**视觉规格**(对齐 `docs/design-system.md`):

| 项 | 值 |
|---|---|
| header 高 | `h-[30px]`,字号 `text-md`,颜色 `text-fg-2`,hover → `text-fg-bright` |
| 项目行高 | `h-[30px]`,字号 `text-sm` (12px) |
| 会话行高 | `h-[30px]`,字号 `text-sm` |
| 项目间间距 | `gap-0.5` (2px) |
| 会话间间距 | `gap-0.5` (2px) |
| section 与上方 | `mt-1` (4px) |
| header 内 padding | outer `pl-1.5` + toggle button `px-2.5`(`项目` 文字从 sidebar 边 16px 开始,与 action 文字对齐);右 padding 为 0,因为滚动容器已用 `scrollbar-gutter: stable` 预留 20px gutter(详见上文滚动条变体小节) |
| 内容容器 padding | `pl-1.5 pb-1.5`(左 6px,底 6px,无右);原因同上 — gutter 已占位,不再额外留白,让项目/会话行的右边缘直接贴 gutter 内边沿,视觉与 header action 按钮对齐 |
| 项目行 padding | `pl-2.5 pr-2.5`,hover 时 `group-hover/row:pr-8` 腾位给 + 按钮 |
| 会话行 padding | `pl-8 pr-2.5`(左 32px,文字起始位置与项目文字同列,视觉嵌套) |
| hover 背景 | `bg-surface-hover`(项目和会话行) |
| active 背景 | `bg-surface-active` + `text-fg-bright`(仿 action 选中态) |
| 时间文字色 | `text-fg-3` |
| chevron 尺寸 | header 与 project 都 10×10(`h-2.5 w-2.5 [&_svg]:h-2.5 [&_svg]:w-2.5` 强制缩 SVG) |

**交互行为**:

- **section 整体折叠**:点 header 中的「项目 + chevron」整块(hover 时 chevron 显形),`sectionExpanded` 切换;折叠走外层 `<Expandable duration={200}>` 高度过渡(`grid-template-rows: 0fr ↔ 1fr`,200ms `ease-out`),项目列表常驻以保证动画可播。
- **header 右侧 IconButton**(filter / add-folder):用 `IconButton` 默认 size(等同 `UserBar` 设置按钮),点击各自 handler;不影响 header toggle。过滤仍是空函数。添加工作目录用 [`Modal`](ui.md#modal) 打开居中输入框,标题「添加工作目录」,输入框透明底并可清空,确认是「确定」。用户粘贴绝对路径后登记;取消、Esc 或点遮罩关闭,不登记。
- **项目展开/收起**:点项目行 toggle。没有收起记录默认展开;收起的 id 记在 `useLocalStore` 的 `projectsCollapsed` 并写入 `relax`。展开/收起走 `<Expandable duration={200}>` 高度过渡(`grid-template-rows: 0fr ↔ 1fr`,200ms `ease-out`),`SessionItem` 列表常驻以保证动画可播。只有展开的项目才拉会话。
- **新对话**:侧栏「新对话」和项目行 `+` 都在目标项目会话列最前放一条内存草稿,标题「新对话」,状态点 `normal`(`--fg-disabled`)。每个项目最多一条。选中它不拉历史。打开草稿时展开对应项目,并展开整块项目列表。
- **项目 icon 切换**:默认显示 folder(展开=open,收起=closed),hover 时切到 chevron(展开=rotate-90 朝下,收起=朝右)。folder 在 14×14 槽内,chevron 缩到 10×10 居中,通过 `group` + `group-hover/row:hidden` / `group-hover/row:flex` 切换,两种 icon 绝对定位重叠占同 14×14 槽,布局不抖。
- **项目 + 按钮**:`opacity-0 group-hover/row:opacity-100`,加 `pointer-events-none` → `group-hover/row:pointer-events-auto` 让 hover 区域可点击,不在 hover 时穿透。`absolute right-2.5 top-1/2 -translate-y-1/2` 居中,IconButton box 右边缘与 session 时间文字右边缘对齐。
- **项目行 hover pr 展开**:`group-hover/row:pr-8`(32px),给 + 按钮腾位;非 hover 时 `pr-2.5`(10px),文字贴近右边。
- **chevron 旋转**:`rotate-0` ↔ `rotate-90`,`transition-transform duration-100`,只动 transform,无 layout 抖动。
- **header chevron**:`opacity-0 group-hover/header:opacity-100`,hover header 行才显形。

**状态**:

项目列表来自 catalog store。每个项目的收起在 `store/local.ts`。`sectionExpanded`(整块折叠)仍是 `ProjectSection` 内部的 `useState`,不写入 `relax`。内存草稿在 catalog store 的 `drafts`,刷新即丢,不写进 `relax`。

**icon 复用**:

- 旋转用 Tailwind 的 `rotate-0` / `rotate-90`,不通过 icon 组件的 props 传 `direction`。
- 缩放用 wrapper span(`h-2.5 w-2.5 [&_svg]:h-2.5 [&_svg]:w-2.5`)强制覆盖 SVG 的 width/height 属性,不修改 icon 组件 API。
- `ChevronRightIcon` 的 `viewBox` 选成 `249 15 477 932`(path 几何中心对齐 viewBox 中心),保证 `rotate-90` 展开态视觉居中。
- `FilterIcon` / `AddFolderIcon` 仅在 `ProjectSectionHeader` 出现;`ChevronRightIcon` / `FolderClosedIcon` / `FolderOpenIcon` / `PlusIcon` 仅在 `ProjectItem` 出现;`SessionItem` 不使用 icon。

### 命名约定

- 组件文件名与组件名一致且单数:`Sidebar` / `Conversation` / `Extension` / `Setting`。
- `className?: string` 用于让父组件控制尺寸/边框(`Conversation`、`Extension`);全幅组件不接 prop(`Sidebar`、`Setting`)。
- props 命名沿用领域词,不缩写:`onOpenSetting` / `onClose`。

### `className` 拼接

所有需要拼接/条件拼接 `className` 的场景,**必须**使用 [`classnames`](https://www.npmjs.com/package/classnames)(`classnames@^2.5.1` 已声明在 `package.json`)。禁止再用模板字符串手动拼接(`\`bg-red ${active ? 'ring' : ''}\``),原因:

- `classnames` 自动过滤 `undefined` / `null` / `false` / 空串,不用写 `?? ''` 兜底。
- 条件类用对象语法 `{ 'ring-2': isActive }` 一眼可读,比三元或 `&&` 字符串拼接更清晰。

```tsx
import classNames from 'classnames'

// 基础:固定 + 外部传入
className={classNames('flex items-center px-3', className)}

// 条件类(对象语法)
className={classNames('btn', {
  'btn-primary': variant === 'primary',
  'btn-disabled': disabled,
})}

// 多条件混合
className={classNames(
  'base',
  isActive && 'active',
  className,
)}
```

不要用字符串拼接构造 Tailwind 类(如 `` `bg-${color}-500` ``),Tailwind 无法识别 — 这条同时已在"踩坑备忘"里。

## 状态管理(`store/`)

`app/web/src/store/` 用 [zustand](https://github.com/pmndrs/zustand) + [immer](https://github.com/immerjs/immer) 集中管理 app shell 的控制状态。`App.tsx` 之前持有的 `settingOpen` / `sidebarOpen` / `extensionOpen` / `mainView` 全部迁入 common store,顺手清掉随之而来的 prop drilling。

### 目录

```
src/store/
├── index.ts          # 统一 re-export,对外只暴露这一个入口
└── common.ts         # common store(shell 状态)
```

每个 store 一个文件,等文件膨胀再考虑子目录拆分。

### common store

`common.ts` 持有 shell 级别的控制状态:

| 字段 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `settingOpen` | `boolean` | `false` | Setting 全屏覆盖层是否打开 |
| `sidebarOpen` | `boolean` | `true` | 外层 Group 中 Sidebar Panel 是否挂载 |
| `extensionOpen` | `boolean` | `false` | 内层 Group 中 Extension Panel 是否挂载 |
| `mainView` | `MainView` | `'conversation'` | MainContainer 当前渲染哪个 view |

配套 actions:`setSettingOpen` / `toggleSetting` / `setSidebarOpen` / `toggleSidebar` / `setExtensionOpen` / `toggleExtension` / `setMainView`,内部用 immer middleware 写法:

```ts
toggleSidebar: () => set((s) => { s.sidebarOpen = !s.sidebarOpen })
```

**不持久化** —— 每次 reload 状态回到默认值。要记住的界面状态加到 `store/local.ts`，不要给 common store 加 `persist`。当前对话的右侧栏开关不在这里记，而在 `extensions` 快照里。

### `MainView` 类型

`MainView` 在 `store/common.ts`，从 `import type { MainView } from './store'` 取。

### 选择器约定

组件订阅**切片**而不是整个 store,避免无关字段变化触发渲染:

```ts
// 单字段 — 只在 sidebarOpen 翻转时重渲染
const sidebarOpen = useCommonStore((s) => s.sidebarOpen)
```

多字段合并时,用 `useShallow` 做浅比较,把多个 `useCommonStore` 合并成一次订阅:

```ts
import { useShallow } from 'zustand/react/shallow'

const { sidebarOpen, extensionOpen, toggleSidebar, toggleExtension } = useCommonStore(
  useShallow((s) => ({
    sidebarOpen: s.sidebarOpen,
    extensionOpen: s.extensionOpen,
    toggleSidebar: s.toggleSidebar,
    toggleExtension: s.toggleExtension,
  })),
)
```

`useShallow` 工作机制:selector 每次返回新对象,`useShallow` 比对上一次返回对象的字段引用,全部相等时复用旧引用 → 不触发 re-render。actions 是稳定引用,放进选择器也不会触发渲染。`MainContainer` / `Setting` / `UserBar` 各只取一个字段,无需合并。

### 不进 store 的状态(YAGNI)

- **面板宽度和项目收起**:在 `store/local.ts`,见上文「持久化」。
- **ProjectSection 的整块折叠**(`sectionExpanded`):只影响这一次打开,不跨刷新。
- **UI-only 状态**(scrollbar hover / Popover open / Setting 内部):跟随组件生命周期即可。

### 新增 store 的流程

1. 在 `store/` 下新建 `<name>.ts`,用 `create<State>()(immer((set) => ({ ... })))` 模式。
2. 在 `store/index.ts` 加 `export * from './<name>'`,对外只暴露一个入口。
3. 组件按需 selector 订阅,跨组件共享的状态才上提,组件内 UI-only state 留在 `useState`。
