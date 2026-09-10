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
  --app: #171717;
  --surface: #242424;
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
| `--app` | `bg-app` | `#171717` | 主背景(中 Conversation、右 Extension、Setting 覆盖层) |
| `--sidebar` | `bg-sidebar` | `#1E1E1E` | 左 Sidebar |
| `--surface` | `bg-surface` | `#242424` | 浮起表面(目前仅 scrollbar 用) |
| `--surface-hover` | `bg-surface-hover` | `#292929` | hover |
| `--surface-active` | `bg-surface-active` | `#2E2E2E` | active |
| `--fg` | `text-fg` | `#E5E5E5` | 主文字 |
| `--fg-bright` | `text-fg-bright` | `#F5F5F5` | hover / active 高亮 |
| `--fg-2` | `text-fg-2` | `#C7C7C7` | 次文字 |
| `--fg-3` | `text-fg-3` | `#A1A1A1` | 三级文字 |
| `--fg-disabled` | `text-fg-disabled` | `#737373` | 禁用 |
| `--border` | `border-border` | `#2A2A2A` | 默认边框 |
| `--border-hover` | `border-border-hover` | `#383838` | hover 边框 |
| `--accent` | `bg-accent` / `text-accent` | `#3FBF73` | 主交互 / 成功 |
| `--success` | `bg-success` | `#3FBF73` | 成功 |
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

hover 高亮统一沿用 `--surface-hover`(与全局一致),不做额外覆盖。

**用法**:consumer 在自己的 `.tsx` 顶部 `import '../styles/scrollbar.css'`,把对应 class 加到滚动容器上。例:`Sidebar.tsx` 在 `ProjectSection` 的滚动容器上加 `scrollbar-shallow`。

新增变体直接在 `styles/scrollbar.css` 内追加,不要往 `index.css` 写 — 保持全局样式的纯净。

## UI 组件库(`ui/`)

`app/web/src/ui/` 是项目的 UI 组件库目录,业务无关、可在多处复用。对内封装第三方库,对上提供与领域词无关的原子组件。

### 何时放进 `ui/`

满足以下**全部**条件:

- **业务无关**:不引用 `Sidebar` / `Conversation` / `Setting` 等任何领域组件,不放领域状态/领域类型。
- **可复用**:在 app shell 之外(未来的二级页、Modal、设置面板、扩展插件等)有复用场景,或对一组第三方 API 做了有项目风格的统一封装。
- **稳定**:API 已收敛,有明确的 props 契约和默认行为。

不满足的 → 放 `components/`(领域组件)或 `hooks/`(逻辑复用)。

### 命名 & 文件

- 文件名与导出组件名一致;单文件单组件。
- props 类型用 `export type {Name}Props`,便于其他模块显式引用。
- 不依赖 `components/`、`hooks/` 里任何领域代码;如有需要,通过 props 注入。

### 当前内容

| 组件 | 包装的库 | 用途 |
|---|---|---|
| `ResizablePanelGroup` | `react-resizable-panels` 的 `Group` | 统一默认 `orientation='horizontal'`,透传其他 props |
| `ResizablePanel` | `react-resizable-panels` 的 `Panel` | 强制 `id` 必填(库要求,但 TS 类型上是 optional),缺失时 dev 模式报错 |
| `ResizableHandle` | `react-resizable-panels` 的 `Separator` | 套一层 1px 分割线 + 5px 命中区 + hover 高亮 |
| `IconButton` | (原生 `button`) | 图标按钮;`variant: ghost \| solid`,`size: sm \| md`;`disabled` 自动降透明 + 禁交互;`type` 默认 `button` 防止 form 内误提交;透传其他原生 button 属性(`aria-pressed` / `name` / `value` / `tabIndex` 等) |

### 新增 UI 组件的流程

1. 在 `docs/design-system.md` 或对应规范里先有该组件的设计/交互定义。
2. 在 `ui/` 下新建文件,导出 `{Name}` 与 `{Name}Props`。
3. 若包装第三方库,类型从该库导出;不要二次发明同名 prop。
4. 在使用方引入并实测一个具体场景(至少 typecheck + 浏览器手测)。
5. 同步更新本节"当前内容"表格。

## 图标(`icons/`)

`app/web/src/icons/` 存放项目自绘的 SVG 图标组件,统一以 `*Icon` 命名导出。颜色走 `currentColor`,适配外层 `text-*` 工具类。

目前两种风格共存,按需选用:

| 风格 | 根属性 | 适用 | 现有图标 |
|---|---|---|---|
| 描边 | `width=16 height=16 viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"` | 简单几何图形(矩形/直线/圆) | `PanelLeftIcon` / `PanelRightIcon` |
| 实心 | `width=14 height=14 viewBox="<shape-bbox>" fill="currentColor"` | 来源是第三方/参考 SVG 的填充字形 | `SendIcon` / `SearchIcon` / `BlocksIcon` / `SettingsIcon` / `ChevronRightIcon` / `FolderClosedIcon` / `FolderOpenIcon` / `AddFolderIcon` / `FilterIcon` / `PlusIcon` |

实心图标的关键:**`viewBox` 设成 path 实际可见形状的 bounding box**(不是固定的 `0 0 1024 1024`)。原因:不同来源 SVG 的 path 占据的 bbox 大小差异很大(如一个纸飞机可能只占 viewBox 的 70%,一个 Blocks 网格占 85%),直接用源 viewBox 会导致渲染出来大小不一致。按 bbox 裁切后每个图标都充满 16×16 渲染区,视觉大小一致。bbox 之外留约 3% 内边距(在 viewBox 内侧加 padding),避免图形贴边。

新增图标:在 `index.tsx` 内追加一个 `export function NameIcon()`,根属性按上表选一种;颜色统一走 `currentColor`,不要写死 hex。

## 布局

app shell 由两层嵌套的 `react-resizable-panels` Group 组成:外层 `[Sidebar | main]`,内层(挂在 `main` Panel 内)`[Conversation | Extension]`。这样拖 `Sidebar | main` 的分隔条不会影响 Conversation/Extension 的内部比例,反之亦然。

### 树结构

```
<div.h-screen.w-screen>
  <Group id="app-shell" orientation="horizontal">     ← 外层
    [optional] <Panel id="sidebar"/>                 ← sidebarOpen=true
    [optional] <Separator/>
    <Panel id="main">                                ← 永远存在
      <Group id="main-area" orientation="horizontal"> ← 内层
        <Panel id="conversation"/>
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
├── App.tsx                       # 持有 settingOpen + collapsed 状态, 嵌套两层 Group
├── hooks/
│   └── usePersistedPanelLayout.ts # 每个 groupId 一份 layout + collapsed 持久化
├── ui/                           # 业务无关的可复用 UI 组件(详见上文 "UI 组件库" 小节)
│   ├── ResizablePanelGroup.tsx
│   ├── ResizablePanel.tsx
│   └── ResizableHandle.tsx
├── icons/                       # 自绘 SVG 图标(详见上文 "图标 (icons/)" 小节)
│   └── index.tsx
└── components/
    ├── Sidebar.tsx               # 左,可被外层 Group 收起(整 Panel 移除)
    ├── SidebarActions.tsx        # Sidebar 顶部三个 action 按钮(新对话/搜索/自定义)
    ├── ProjectSection.tsx        # Sidebar 中部"项目"区块(标题行 + 项目列表)
    ├── ProjectSectionHeader.tsx  # "项目"区块标题行:标题 + hover-only chevron + 过滤 + 添加项目
    ├── ProjectItem.tsx           # 单个项目行:folder/chevron icon + 名称 + hover-only +;展开后渲染 SessionItem 列表
    ├── SessionItem.tsx           # 单个会话行:标题 + 相对时间
    ├── Conversation.tsx          # 中,顶部带 toggle 按钮控制 sidebar/extension 收起
    ├── Extension.tsx             # 右,可被内层 Group 收起(整 Panel 移除)
    ├── Setting.tsx               # 全屏 fixed inset-0 z-50 覆盖层
    └── UserBar.tsx               # 用户信息条(头像 + 用户名 + 设置入口),固定高 48px,可在 Sidebar / Setting 左下复用
└── utils/
    └── relativeTime.ts           # formatRelativeTime(ms) — "Nm" / "Nh" / "Nd" / "Nw"
```

### 区段尺寸

| 区 | `defaultSize` | `minSize` | `maxSize` | `groupResizeBehavior` | 所在 Group |
|---|---|---|---|---|---|
| Sidebar | `260`px | 200px | 400px | (默认) | 外层 |
| main | 剩余空间 | 630px(= 320 + 300 + 分隔条) | — | (默认) | 外层 |
| Conversation | 剩余空间(无 `defaultSize`) | 320px | — | (默认) | 内层 |
| Extension | `540`px | 300px | — | `preserve-pixel-size` | 内层 |
| Setting | `fixed inset-0` | — | — | — | 全屏覆盖 |

**设计意图:**

- `Conversation` 不写 `defaultSize`,library 自动把内层剩余空间全部分给它 — 对话区总是尽可能宽。
- `Extension` 用绝对值 `540`px + `preserve-pixel-size`,外层 Group 整体宽度变化时,先保住 Extension 的像素宽度,多出的空间让给其他可伸缩面板。适合"右侧固定宽度"的场景。
- `main` 的 `minSize={630}` 保证内层 conv(320) + ext(300) + 分隔条不会把空间压到不可用。
- `Sidebar` 的 `maxSize={400}` 防止拖太宽挤掉对话区。

### 收起/展开

`App.tsx` 持有 `{ sidebar: boolean; extension: boolean }` collapsed 状态,持久化到 `localStorage` key `app-shell:layout:app-shell:collapsed`。

收起 = 整 Panel 从所属 Group 中移除(`{sidebarOpen && <Panel/>}` 模式),不是 `collapsedSize:0`。这样展开时回到原记录的宽度。

`Conversation` 顶部提供两个 IconButton 分别 toggle sidebar / extension,标题反映当前状态(`收起 / 展开左侧栏` 等)。

### 持久化

`usePersistedPanelLayout({ groupId, panelIds })` 是库的 `useDefaultLayout` 的薄包装:

- layout 存到 `app-shell:layout:<groupId>`
- 内层 Group(`groupId='main-area'`)独立持久化自己的 `[conversation, extension]`
- 外层 Group(`groupId='app-shell'`)持久化 `[sidebar, main]`

reload 后两层各自还原。

`App.tsx` 用 `useState(settingOpen)` 控制 Setting 显隐:`{settingOpen && <Setting onClose={...} />}`。Setting `z-50`,在四区上方全屏渲染。

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
| header 内 padding | outer `px-1.5` + toggle button `px-2.5`(`项目` 文字从 sidebar 边 16px 开始,与 action 文字对齐) |
| 项目行 padding | `pl-2.5 pr-2.5`,hover 时 `group-hover/row:pr-8` 腾位给 + 按钮 |
| 会话行 padding | `pl-8 pr-2.5`(左 32px,文字起始位置与项目文字同列,视觉嵌套) |
| hover 背景 | `bg-surface-hover`(项目和会话行) |
| active 背景 | `bg-surface-active` + `text-fg-bright`(仿 action 选中态) |
| 时间文字色 | `text-fg-3` |
| chevron 尺寸 | header 与 project 都 10×10(`h-2.5 w-2.5 [&_svg]:h-2.5 [&_svg]:w-2.5` 强制缩 SVG) |

**交互行为**:

- **section 整体折叠**:点 header 中的「项目 + chevron」整块(hover 时 chevron 显形),`sectionExpanded` 切换;折叠时整个项目列表卸载。
- **header 右侧 IconButton**(filter / add-folder):用 `IconButton` 默认 size(等同 `UserBar` 设置按钮),点击各自 handler;不影响 header toggle。
- **项目展开/收起**:点项目行 toggle,`expandedIds: Set<string>` 记录状态;展开后才挂载 `SessionItem` 列表,不是 CSS hide — 收起时整段 DOM 卸载,免内存。
- **项目 icon 切换**:默认显示 folder(展开=open,收起=closed),hover 时切到 chevron(展开=rotate-90 朝下,收起=朝右)。folder 在 14×14 槽内,chevron 缩到 10×10 居中,通过 `group` + `group-hover/row:hidden` / `group-hover/row:flex` 切换,两种 icon 绝对定位重叠占同 14×14 槽,布局不抖。
- **项目 + 按钮**:`opacity-0 group-hover/row:opacity-100`,加 `pointer-events-none` → `group-hover/row:pointer-events-auto` 让 hover 区域可点击,不在 hover 时穿透。`absolute right-2.5 top-1/2 -translate-y-1/2` 居中,IconButton box 右边缘与 session 时间文字右边缘对齐。
- **项目行 hover pr 展开**:`group-hover/row:pr-8`(32px),给 + 按钮腾位;非 hover 时 `pr-2.5`(10px),文字贴近右边。
- **chevron 旋转**:`rotate-0` ↔ `rotate-90`,`transition-transform duration-100`,只动 transform,无 layout 抖动。
- **header chevron**:`opacity-0 group-hover/header:opacity-100`,hover header 行才显形。

**状态**:

`ProjectSection` 是 self-contained:内部 `useState` 管 `projects`(目前 mock) + `expandedIds` + `sectionExpanded`,**不持久化**。等真实数据接入后,这些 state 上提到 store / props 注入。

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