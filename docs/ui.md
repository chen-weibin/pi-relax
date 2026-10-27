# UI 组件库

`app/web/src/ui/` 是 `app/web` 的 UI 组件库目录,业务无关、可在多处复用。对内封装第三方库,对上提供与领域词无关的原子组件。

> 集成层(Tailwind 接入、设计 token、`app/web` 四区布局、滚动条变体)在 [`docs/web.md`](web.md)。本文档回答「该用哪个 / 别自己写 / 组件细节」。要对着实机看形态时，本地开发服务器打开 `/ui`（生产构建不含这条路由）。说明和演示在 `app/web/src/uidoc/`，API 仍看本文。

## 何时放进 `ui/`

满足以下**全部**条件:

- **业务无关**:不引用 `Sidebar` / `Conversation` / `Setting` 等任何领域组件,不放领域状态/领域类型。
- **可复用**:在 app shell 之外(未来的二级页、Modal、设置面板、扩展插件等)有复用场景,或对一组第三方 API 做了项目风格的统一封装。
- **稳定**:API 已收敛,有明确的 props 契约和默认行为。

不满足的 → 放 `components/`(领域组件)或 `hooks/`(逻辑复用)。

## 命名 & 文件

- 文件名与导出组件名一致;单文件单组件(`ui/Foo.tsx`),或同名目录 `Foo/index.tsx`(有独立样式时再配 `index.css`,如 `MarkdownView/`、`MessageSurface/`、`Editor/`)。
- props 类型用 `export type {Name}Props`,便于其他模块显式引用。
- 不依赖 `components/`、`hooks/` 里任何领域代码;如有需要,通过 props 注入。

## 决策表:该用哪个

| 需求 | 用 | 别用 / 别写 |
|---|---|---|
| 三栏/两栏可拖布局 | [`ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle`](#resizablepanels) | 不要直接用 `react-resizable-panels` 原生 API |
| 图标按钮(可访问、统一样式) | [`IconButton`](#iconbutton) | 不要写裸 `<button>` 套 `<svg>`(style 漂移、`disabled` 漏处理);不要再外包一层 Tooltip,`title` 就是提示 |
| 短 hover 提示 | [`Tooltip`](#tooltip) | 不要在业务里手写 `<Popover role="tooltip">`,也不要再用原生 `title` 当气泡 |
| 浮层 / 菜单 | [`Popover`](#popover) | 不要直接用 `@floating-ui/react`(定位/翻转/portal 都要自己粘) |
| 遮罩对话框(居中或距顶) | [`Modal`](#modal) | 不要手写 `fixed inset-0` 遮罩;不要把 [`Popover`](#popover) 当成对话框 |
| 富文本输入(Enter 提交 / 多行展开) | [`Editor`](#editor) + 领域组件 `Composer` | 不要拿 `<textarea>`(无 IME 友好 / 无 history / 无 keymap) |
| 渲染 Markdown(流式 / 静态) | [`MarkdownView`](#markdownview) | 不要直接 `<Streamdown>`(无项目样式封装) |
| 只读/可编辑代码文本(Monaco) | [`MonacoEditor`](#monacoeditor) | 不要在业务里直接 `@monaco-editor/react` / 自配 worker |
| 逐字打字机(纯文本) | [`TypewriterText`](#typewritertext) | 不要自己写 `setInterval` / `requestAnimationFrame` 循环切字符串 |
| 渐变扫光文字(标题 / CTA / loading) | [`ShinyText`](#shinytext) | 不要自己写 `linear-gradient` + `@keyframes`,也不要为单次使用装 `motion` |
| 标题 + 展开收起(chevron + 高度过渡 + 标题可扫光) | [`DisclosureRow`](#disclosurerow) | 不要写本地 `<button>` + `<svg>` + `useState` 三件套 |
| 任意区域的高度过渡展开(无 header) | [`Expandable`](#expandable) | 不要自己写 `max-height` 凑数(无法适配动态内容高度);不要为单处使用装 `framer-motion` |
| 单行文本输入(尺寸、清空、前后缀、字数、状态、提示) | [`Input`](#input) | 不要写裸 `<input>` 再拼清空、字数和状态边框;带搜索图标仍用 [`SearchInput`](#searchinput) |
| 搜索框(带搜索图标、统一 hover/focus) | [`SearchInput`](#searchinput) | 不要写裸 `<input>` + 绝对定位 icon 的样式散落 |
| 设置面板里的分组卡片(可选小标题) | [`SettingGroup`](#settinggroup) | 不要在 Setting 页里写裸 `<section rounded-xl bg-surface>` + `<h2>` 三件套 |
| 设置面板里的一行(左 label + 描述,右控制区) | [`SettingRow`](#settingrow) | 不要写裸 `<div flex justify-between><div>{label}<div>{desc}</div></div><div>...</div></div>` 三层嵌套 |
| 开关(on/off,绿色 + 灰色态) | [`Switch`](#switch) | 不要写裸 `<button role="switch">` + `translate-x-*` 自己拼 thumb 位移 |
| 选择器(静态 / 懒加载 / 搜索三合一) | [`Select`](#select) | 不要写裸 `<select>`(样式难统一),也不要在 Setting 里再写 `<Popover>` + 自己造 listbox |
| 数字步进器(- n + 圆角 pill) | [`NumberStepper`](#numberstepper) | 不要写裸 `<div flex><button>-</button><span>{n}</span><button>+</button></div>` 三段散落 |
| 连续范围拖拽(0–100% / 任意区间,带 thumb + 槽位) | [`ProgressBar`](#progressbar) | 不要写裸 `<input type="range">`(样式无法走 token、a11y / 键盘 / pointer capture 都要自己粘) |
| 轻量卡片外壳(无角色语义) | [`MessageSurface`](#messagesurface) | 不要在块组件里手写 `bg-surface rounded-md border-border` 之类的样式散落 |
| 「正在生成 / 思考中」的 3 点循环动效 | [`LoadingDots`](#loadingdots) | 不要写 3 个 `<span>` + 自写 `@keyframes`;不要用 `DotMatrix`(它是 3×3 / 4×4 点阵,语义/视觉不一样) |
| 点阵 loading(3×3 / 4×4,多尺寸多形状) | [`DotMatrix`](#dotmatrix) | 不要为单个 loading 写一次性 `<div>` 网格 + 自写 CSS `@keyframes`(`motion/react` 已在依赖里) |
| 单点状态指示(成功 / 失败 / 已读) | [`StatusDot`](#statusdot) | 不要为 `success` / `failure` 单独写 `<div>` + 内联颜色;统一走 `StatusDot` + 项目语义色 token |
| 插件 / 子面板顶栏(固定 38px + 底部分割线) | [`PaneHeader`](#paneheader) | 不要手写 `h-[38px] + border-b border-border` 顶栏三件套 |

## 反例:这些事不要做

| 反例 | 为什么 |
|---|---|
| 把 `MessageSurface` 用作「用户气泡专用外壳」 | `MessageSurface` 无角色语义,user / assistant 都能用;对齐方式由消费方(`UserMessage` / `AssistantMessage`)决定 |
| 在 `DisclosureRow` 里写「思考 / 思考中」 | `DisclosureRow` 不写业务文案;文案的归属是 `ThinkingMessage`。换业务直接换调用方,不改组件 |
| 给 `DisclosureRow` 加 `disabled` 之外的「流式 / 完成」状态 | 流式/完成状态属于业务(`ThinkingMessage` 内 `streaming = block.contentPhase === 'open'`)。`DisclosureRow` 只暴露 `blinking`,具体闪烁动画由 `ShinyText` 提供 |
| 在 `ui/` 写引用 `Conversation` / store / `BlockSnapshot` 的组件 | 破坏「业务无关」约束,该放 `components/conversation/` |
| 给原子组件加 `useMemo` 缓存 style 对象 / 三元 ReactNode | 没有 profile 证据的优化都是复杂度;`useMemo` 命中窗口极短、收益可忽略,代价是阅读干扰 |
| 重新写一个 `framer-motion` 的高度过渡替代 `Expandable` | `Expandable` 用原生 `grid-template-rows: 0fr ↔ 1fr` 已经解决,装一个 50KB+ 的动画库只为「容器高度过渡」不划算 |
| 在 `MarkdownView` 外又写一套 `<Streamdown>` 配置 | 流式/静态/动画三件套已经被 `MarkdownView` 收敛,直接复用 |
| 用一次性 4 个 `<span>` + 自写 `@keyframes dot-pulse` 做 loading | 用 `DotMatrix`,已经覆盖尺寸 / 栅格 / 点形 / 动画算法四种轴 |
| 在会话/列表前缀直接写 `<span className="h-1.5 w-1.5 rounded-full bg-green-400">` | 用 `StatusDot`,颜色走 `--success` / `--error` / `--fg-3`,跟随主题 |
| 给 `ProgressBar` 加 `color` / `trackColor` / `thumbColor` 等 per-instance 颜色 prop | 颜色走 token(`bg-fg-3` / `bg-border-hover`);想换色通过外层 `className` + 子选择器覆盖,不要把调色板塞进 API |
| 在插件主区顶部手写 `h-[38px] flex border-b` | 用 [`PaneHeader`](#paneheader),高度和分割线已收敛 |
| 在业务模块里直接 `import Editor from '@monaco-editor/react'` | 用 [`MonacoEditor`](#monacoeditor),worker / 主题 token 已封装 |
| 给 `IconButton` 再写原生 `title`,或在业务里手写 `<Popover role="tooltip">` | 图标按钮的 `title` 已走 [`Tooltip`](#tooltip);短提示用 Tooltip,菜单才用 [`Popover`](#popover) |
| 在 `IconButton` 外包一层 `Tooltip` | [`IconButton`](#iconbutton) 已内置,配 `title` / `tooltipPlacement` / `tooltipDelay` 即可 |
| 为对话框手写 `fixed inset-0` + 点遮罩关闭 | 用 [`Modal`](#modal)。Setting 那种整页覆盖仍自己写 |
| 手写带清空、前后缀、字数或状态边框的 `<input>` | 用 [`Input`](#input)。搜索框仍用 [`SearchInput`](#searchinput) |

## Expandable

单文件 `ui/Expandable.tsx`。高度过渡的展开/收起容器,**纯展示**,不提供 header / chevron。需要 header 时改用 [`DisclosureRow`](#disclosurerow)。

**查阅时机**:决定加一个「折叠区域」(Setting 分组、可折叠详情),判断「这个要不要动画」,或在 `DisclosureRow` 之外需要高度过渡的容器。

**何时用**:

- 一块内容需要「折叠 / 展开」,业务自己管 open 状态
- 不需要标题行、不需要 chevron(这些让 `DisclosureRow` 管)

**何时不用**:

- 需要 header / chevron → [`DisclosureRow`](#disclosurerow)
- 只是显示/隐藏 → 加 `hidden` 类,不要动画
- 进/出动画(透明度、位移) → 用 `motion/react` 的 `AnimatePresence`(本项目没现成包装)
- 内容高度永远不会变 → `<details>` 元素更轻

**API**:

```tsx
<Expandable open={open} duration={200} className="…">
  {children}
</Expandable>
```

**实现**:外层 `display: grid`,`grid-template-rows` 在 `0fr` ↔ `1fr` 之间切换;内层 `min-h-0 overflow-hidden` 让浏览器原生过渡 `0 → 内容高度`。零 JS state、零 ResizeObserver、零动画库。

| 项 | 值 |
|---|---|
| 动画属性 | `grid-template-rows`(chrome 117+ / ff 121+ / safari 17.4+) |
| 时长 | `duration` 默认 200ms;`transitionDuration` 通过 inline style 注入,避免 Tailwind 不能扫到 |
| 缓动 | `ease-out` |
| `aria-hidden` | `open=true` 时 false,`open=false` 时 true(屏幕阅读器把折叠内容当隐藏) |
| `className` | 透传到外层 grid 容器 |

**踩坑备忘**:

- 兼容性 < chrome 117 时没有高度过渡,只做"显 / 隐"硬切。渐进增强,可用。
- 内容若自身有 `transition` / `animation`,在 `0fr` 状态下可能仍触发一帧渲染(浏览器会保留 visibility)。这是已知行为,生产里没影响。
- 不要在外层再包 `overflow-hidden`,会让 `0fr` 过渡到中间帧时内层裁掉,看起来"卡住"。

## DisclosureRow

单文件 `ui/DisclosureRow.tsx`。**标题 + chevron + 展开收起**三件套。chevron 在 `title` 之后;展开时 chevron `rotate-90`(顺时针朝下)。`title` 是 string 且 `blinking` 时标题走 [`ShinyText`](#shinytext);其他情况直接渲染。

**查阅时机**:加一个折叠标题行(思考块、工具块、错误详情、Setting 分组),或决定标题的「流式 / 完成」状态怎么呈现。

**何时用**:

- 有「一行标题 + 一段内容」的折叠结构
- 想让标题在「流式 / 未完成」时自动有扫光效果(传 string title + `blinking`)
- 想用项目默认的 chevron 旋转 + 高度过渡样式

**何时不用**:

- 只需要「高度过渡容器」,不需要 header / chevron → [`Expandable`](#expandable)
- `title` 必须是 ReactNode 且想保留原 CSS `disclosure-title-blink` 风格 → 自己写(目前没有该场景)
- 多级嵌套折叠 → 自己写;`DisclosureRow` 不管父子联动

**API**:

```tsx
<DisclosureRow
  title="思考"
  open={open}
  onOpenChange={setOpen}
  blinking={false}        // 仅 string title 生效;走 ShinyText 闪光
  disabled={false}
  duration={200}          // 透传给内部 Expandable
>
  {children}
</DisclosureRow>
```

| 项 | 值 |
|---|---|
| header 字号 | `text-base`(14px,`@theme` 已覆盖 tailwind 默认) |
| header 文字色 | `text-fg-3`,hover → `text-fg-2` |
| header 间距 | `gap-1.5`(标题 ↔ chevron) |
| header 内边距 | `py-0.5` |
| chevron 槽 | `h-2.5 w-2.5`(10×10),内部 svg 强制 `h-2.5 w-2.5` |
| chevron 旋转 | `transition-transform duration-100`,open=true 时 `rotate-90` |
| 折叠动画 | 内部 `<Expandable duration={duration}/>`,200ms `ease-out` |
| `title` 类型 | `ReactNode`;string + `blinking` → `ShinyText`,否则原样渲染 |
| `blinking` | 不写业务文案(不要传入 `'思考中'` 等流式状态字符串);状态语义由调用方决定 |

**为什么不再用 `disclosure-title-blink`**:之前的实现是 CSS `@keyframes` 把标题 opacity 在 1 ↔ 0.35 之间切。问题:整行闪,不够"高级",且没法利用 `--fg-bright` 高亮色做扫光。改为 string title + `blinking` 时挂 `ShinyText`(`color=var(--fg-3)`,`shineColor=var(--fg-bright)`),视觉一致但更克制。

## ShinyText

单文件 `ui/ShinyText.tsx`,基于 `motion/react`(`useMotionValue` + `useAnimationFrame` + `useTransform`)。`linear-gradient` 扫光文字,`background-position` 在 `150%` ↔ `-50%` 之间循环。

**查阅时机**:做「加载中 / 流式 / 等待」的文字高亮(配合 `DisclosureRow.blinking`),或给 CTA / 标题加扫光效果。

**何时用**:

- 一行或单词标题,想要循环扫光强调
- 配合 `DisclosureRow.blinking` 做「思考中 / 生成中」状态
- 临时性提示文字(loading / ready)

**何时不用**:

- 整段文本作为标题反复出现(扫光会分散注意力) — 改用普通 `<span>` + `text-fg-bright`
- 多行文本(扫光只在单行内有效,且 `background-size: 200% auto` 不适合多行)
- 想要"加载中"的圆点循环闪烁 — 用 CSS `@keyframes` 自己写三个点
- 想做"文字渐入"一次性动画 → CSS `@keyframes` + `animation-fill-mode: forwards` 就够,别拉 motion

**API**:

```tsx
<ShinyText
  text="✨ Shiny Text Effect"
  speed={2}                    // 单程秒数,默认 2
  delay={0}                    // 单程结束到下次开始的停顿(秒),默认 0
  color="#b5b5b5"              // 主色,默认 #b5b5b5
  shineColor="#ffffff"         // 扫光高亮色,默认 #ffffff
  spread={120}                 // 渐变角度,默认 120deg
  direction="left"             // 'left' | 'right',默认 'left'
  yoyo={false}                 // 是否往返(默认只走一个方向)
  pauseOnHover={false}         // hover 时暂停
  disabled={false}             // 完全停动画但保留 DOM
/>
```

**实现要点**:

- `useAnimationFrame` 累加 `elapsed`,按 `speed + delay` 算单程进度,设给 `progress`(MotionValue)
- `useTransform(progress, p => \`${150 - p * 2}% center\`)` 把进度映射到 `background-position`
- `direction` 切换时:`useEffect` 重置 `elapsedRef` + `progress`,避免跳变
- `disabled=true` 时 `useAnimationFrame` 内直接 `return`,不再更新 progress,但 motion.span 与渐变保留 → DOM 静止

**与 token 的配合**:在 `DisclosureRow` 内使用时,`color` 直接传 CSS 变量字符串 (`var(--fg-3)` / `var(--fg-bright)`),让扫光跟随主题切换。其它用法建议沿用 token。

**踩坑备忘**:

- `motion/react` 是项目级依赖(`package.json` 已含 `motion`)。不要为单次使用新装库。
- 不要把 `ShinyText` 套在 flex / grid item 内但忘了 `inline-block` — wrapper 默认 `inline-block`,但若父容器是 `display: flex` 子项默认 `align-items: stretch`,文本 baseline 不稳。
- 单次使用不值得时:为「一个标题加扫光」装 motion + 写一个组件 → 投入产出不成比例,改用 CSS `@keyframes` 临时写在 `index.css`。

## MarkdownView

目录 `ui/MarkdownView/`(`index.tsx` + `index.css`),封装 `streamdown` 与四个官方插件(`code` / `mermaid` / `math` / `cjk`)。`@source` 写在 `MarkdownView/index.css`(核心包 + 四个插件的 `dist/*.js`),由 `src/index.css` `@import` 进 Tailwind 入口;不要只在 TSX 里 import 这份 CSS,否则 `@source` 不生效。

**查阅时机**:渲染用户/agent 输出的 Markdown(静态或流式),或在已有纯文本组件上加 Markdown 支持。

**何时用**:

- 内容是 Markdown 字符串(回答、思考、说明、文档)
- 流式场景(`mode='streaming'`)让未闭合语法自动补全
- 项目风格的字体 / 颜色 / 代码块 / 标题字号需要统一

**何时不用**:

- 纯文本 + 逐字打字机 → [`TypewriterText`](#typewritertext)
- 想要扫光文字 → [`ShinyText`](#shinytext)
- 内容是用户原始输入(还没渲染)→ [`Editor`](#editor)
- 内容是 raw HTML 或自定义 DSL → 直接渲染,不要走 Markdown

**API**:

```tsx
<MarkdownView
  text={markdown}
  mode="static"               // 'static' | 'streaming',默认 'static'
  isAnimating={false}         // 流式进行中：禁用复制、代码块内跟底、并播 animated
  className="…"
/>
```

| 项 | 值 |
|---|---|
| `mode='static'` | 完整 Markdown,`parseIncompleteMarkdown=false` |
| `mode='streaming'` | 未闭合语法自动补全(`**` → `<strong>` 推迟闭合、` ``` ` → 临时占位),适合边渲染边收 |
| `isAnimating` | 流式进行中为 true：禁用代码块复制、代码块内部贴底、并启用 `animated` |
| `animated` | `blurIn` / 200ms / ease-out；仅 `isAnimating` 时拆词淡入，历史消息不套动画 DOM |
| `lineNumbers` | `true`(围栏代码块显示行号) |
| `controls` | 代码块复制开、下载关;mermaid 下载关,全屏/复制走官方默认 |
| `plugins` | `@streamdown/code`(Shiki)、`mermaid`、`math`(KaTeX,`$$` 定界)、`cjk` |
| `shikiTheme` | `['github-light', 'github-dark']`;html `color-scheme` 跟 `data-theme` 走 |
| `codeBlockMaxHeight` | `0`(关掉 streamdown 打在 body 上的高度,改由外壳 `max-height: 400px`,header 固定、content 滚动) |
| 视觉 | 见 `index.css`:行高 1.6、行内 code 圆角 4、`a` 用 `--info`、blockquote 左侧 2px `--border-hover`;代码块 / mermaid 外框 `--border`,header `--surface`,content `--app` |

**踩坑备忘**:

- `parseIncompleteMarkdown` 在 `mode='streaming'` 时自动 true,不要手动开,会让 `mode='static'` 渲染坏掉。
- 公式只用 `$$`,不要开 `singleDollarTextMath`,避免和金额 `$` 冲突。
- 极长 Markdown(> 5k 字)会让 streamdown 同步解析阻塞主线程一次;若遇到,后续考虑 `requestIdleCallback` 切 chunk。

## TypewriterText

单文件 `ui/TypewriterText.tsx`。rAF + `Intl.Segmenter` grapheme 增量逐字显示,文本到达目标后停帧。

**查阅时机**:做逐字打出效果(欢迎语、命令面板开场、纯文本回放),或评估是否替换为 MarkdownView。

**何时用**:

- 纯文本(无 Markdown)需要「字符级动画」
- 文本会持续追加,需要 grapheme 增量缓存
- 内容短(< 200 字),rAF 主循环开销可忽略

**何时不用**:

- 内容含 Markdown(打字机只看字符不看语法,未闭合会让渲染闪)→ [`MarkdownView`](#markdownview)
- 想要「光标闪烁」 — 自己加 CSS,`TypewriterText` 不管 cursor
- 长度 < 4 字,直接 `text-fg` 显示
- 想要「整段渐入」(不是逐字)→ CSS `@keyframes` + opacity

**API**:

```tsx
<TypewriterText
  text="…"
  playing={open && streaming}  // 是否在播
  charsPerSec={48}             // 默认 48
  onCaughtUp={() => { … }}     // 追上时回调
  className="…"
/>
```

**行为**:

- `playing=false` 时直接显示全文(不走动画)
- `playing=true` 时按 `charsPerSec` 累加,每帧切 grapheme,追到末尾停
- grapheme 缓存:相同前缀复用,避免每帧 `Intl.Segmenter` 重切整段
- `text` 变化时增量追加(若新文本是旧文本的前缀扩展,缓存续上)

## LoadingDots

单文件 `ui/LoadingDots.tsx` + `ui/LoadingDots.css`(CSS 放同目录,Vite 注入)。3 个 6×6 圆点循环动效,3 种变体共享一套组件,只换 keyframes。

**查阅时机**:需要「正在生成 / 思考中 / 流式等待」的轻量视觉占位时使用。

**何时用**:

- 流式回复 / agent 思考中,需要一个小动效提示「还在跑」
- 想跟随主题切换(亮/暗)而不是写死 Tailwind 色值
- 想在两档预设色(`muted` / `accent`)和自定义色之间自由切换

**何时不用**:

- 需要圆环 spinner / 进度条 / 骨架屏 → 另写专用组件
- 需要彩色 / 多状态(成功 / 错误)→ `LoadingDots` 只表示「进行中」单一状态
- 需要 9 / 16 点的「乱中有序」loading → [`DotMatrix`](#dotmatrix)
- 整片区域 > 30 px(`LoadingDots` 固定 6px 点,放大无意义)

**API**:

```tsx
<LoadingDots
  variant="bounce"                  // 'bounce' | 'fade' | 'pulse',默认 'bounce'
  color="muted"                     // 预设 'muted' / 'accent',或其它任意 CSS 颜色字符串
  className="…"                     // 透传 wrapper
  label="生成中"                    // aria-label,默认 'Loading'
/>
```

| 项 | 值 |
|---|---|
| wrapper | `<span role="status" aria-label>` 内联,`display: inline-flex` |
| dot 尺寸 | 6×6 px(`pulse` 变体 7×7);圆角 50% |
| 间距 | `gap: 5px` |
| 颜色 | wrapper `color` 走 CSS 变量,dot `background: currentColor` 继承;预设色 → token,自定义 → 字面量 |
| 动效属性 | `transform` + `opacity` 等仅触发 GPU 合成层的属性 |
| `prefers-reduced-motion` | 自动 `animation: none; opacity: 1`(静态可见,不丢语义) |

**预设色**:

| `color` | 解析为 | 视觉 |
|---|---|---|
| `'muted'` (默认) | `var(--fg-3)` | 静默灰,通用场景 |
| `'accent'` | `var(--accent)` | 品牌绿,适合"在干活"的存在感 |
| 其它字符串 | 原样当 CSS 颜色 | 任意 hex / rgb / CSS 变量字符串,如 `"#ff0000"` / `"var(--info)"` |

**变体对比**:

| `variant` | 节奏 | 视觉 | 何时用 |
|---|---|---|---|
| `bounce`(默认) | translateY ±6px + opacity,1.4s 周期,stagger 0.16s | 上下跳动 | 经典 typing,最常用 |
| `fade` | 仅 opacity,1.2s 周期,stagger 0.2s | 涟漪渐变 | 最安静、不抢注意力 |
| `pulse` | scale 0.6→1 + opacity,1.2s 周期,stagger 0.15s | 缩放呼吸 | Material/Apple 风,信息感更强 |

**示例**:

```tsx
// 默认:bounce + 静默灰
<LoadingDots label="生成中" />

// 强调:bounce + 品牌绿(对应原 demo 的 4 号)
<LoadingDots variant="bounce" color="accent" />

// 安静:fade wave
<LoadingDots variant="fade" />

// 自定义颜色
<LoadingDots color="#5B9CF6" />
```

**实现要点**:

- 颜色走 wrapper 的 inline `style.color`,dot 用 `background: currentColor`,所以预设(`muted`/`accent`)和自定义字符串在同一渲染路径上,不需要为自定义颜色另写一套 DOM。
- keyframes 各变体独立命名(`loading-dots-bounce` / `-fade` / `-pulse`),用 wrapper 类名(`.loading-dots--{variant}`)作前缀作用域,避免污染其他组件。
- 三个 dot 通过 `nth-child` 配 `animation-delay` 形成错峰,不需要 JS。

**踩坑备忘**:

- 组件**不**自带背景框 / 圆角外壳;如果消费场景需要气泡外壳,自己在外层加 `<MessageSurface>` 或自定义容器,不要把外壳写进组件(会让别的场景被迫背样式)。
- `prefers-reduced-motion: reduce` 下 dot `animation: none; opacity: 1` —— 让无障碍用户也能看到一个稳定的指示,而不是空画面。
- 不要用 `LoadingDots` 替代 `DotMatrix`,反之亦然:前者是 3 点 typing / 后者是 9/16 点 chaos,语义和视觉都不同。
- 若以后要把 `LoadingDots` 套进 `<ShinyText>` / `<DotMatrix>` 等已经控动画的元素里,会出现动画引擎互相干扰(本项目目前没有这种用法,但记一笔)。

## DotMatrix

单文件 `ui/DotMatrix.tsx`。基于 `motion/react` 的 9 / 16 点阵 loading,每个点用独立 `animation-delay` 形成「乱中有序」的循环闪烁。`role="status"` + `aria-label`,`prefers-reduced-motion` 由调用方决定(`motion` 在 `reduce` 下自动停帧)。

**查阅时机**:在任何 loading / 生成中 / 流式等待场景需要一个轻量视觉占位时使用。

**何时用**:

- 整片区域 < 30 px(按钮内、列表项前缀、状态指示)
- 需要「一直在动、有节奏但不机械」的视觉
- 需要可调尺寸 / 栅格 / 点形 / 节奏算法

**何时不用**:

- 需要圆环 spinner / 进度条 / 骨架屏 → 另写专用组件
- 需要彩色 / 多状态(成功 / 错误) → `DotMatrix` 只有单一 loading 形态
- 尺寸 > 30 px:`DotMatrix` 设计上只覆盖小尺寸,放大后点会糊

**API**:

```tsx
<DotMatrix
  size="md"            // 'xs' 12 | 'sm' 16 | 'md' 20 | 'lg' 24,默认 md
  grid="3x3"           // '3x3' | '4x4',默认 3x3
  shape="rounded"      // 'round' 圆 | 'rounded' 圆角方,默认 rounded
  algorithm="chaotic"  // 'chaotic' 乱中有序 | 'rotation' 顺时针绕中心,默认 chaotic
  className="…"        // 透传
  label="Loading"      // aria-label
/>
```

**行为**:

- 9 / 16 个点(取决于 `grid`),背景色 `var(--fg-3)`,亮态 opacity 1,暗态 0.2
- `chaotic`:`delay[i] = (i × 173) mod 800` — 经典「乱中有序」,视觉上无明显轨迹
- `rotation`:每个点的 `delay` 由「极角(CW 从顶) + ±50ms 抖动」决定,整体呈顺时针脉冲,4×4 视觉最明显
- 周期 800ms,`easeInOut`,infinite loop

**踩坑**:

- 不要把 `DotMatrix` 套在 `motion/react` 已经控动画的元素里(例如 `ShinyText` 内) — 动画引擎冲突,闪烁不规则
- `aria-label` 默认「Loading」;若放进「正在生成 / 思考中」语境,调用方应覆盖为对应文案

## StatusDot

单文件 `ui/StatusDot.tsx`。6px 实心圆点,三种 kind 对应项目语义色:`success → var(--success)`、`failure → var(--error)`、`normal → var(--fg-3)`。`role="status"` + `aria-label`。

**查阅时机**:在会话/列表前缀需要「成功 / 失败 / 已读」单一指示时使用。

**何时用**:

- 列表项前缀位置需要一个小色点传达会话状态
- 想跟随主题切换(亮/暗模式)而不是写死 Tailwind 色值
- 状态语义是固定的几种(success / failure / normal / 后续扩展)

**何时不用**:

- 需要图标 / 多字符 / 复杂视觉(如带勾的圆) → 自己写 SVG 或另开组件
- 需要动画(进行中闪烁) → 用 [`DotMatrix`](#dotmatrix)
- 颜色超出 `--success` / `--error` / `--fg-3` 范围(自定义品牌色) → `StatusDot` 不接受自定义颜色,改用普通 `<span>` 内联 `bg-{color}`

**API**:

```tsx
<StatusDot
  kind="success"    // 'success' | 'failure' | 'normal'
  className="…"     // 透传
  label="…"         // aria-label,默认 = kind
/>
```

**行为**:

- 尺寸固定 6×6 px(Tailwind `h-1.5 w-1.5`),不接受尺寸 prop — 设计上就是会话前缀这个固定用法
- 颜色走 CSS 变量,跟随主题;调用方不可覆盖

**踩坑**:

- `kind` 改变只是换颜色,不会重新挂载节点 — 不要假设组件内部会因为 `kind` 切换做动画;需要过渡自己加 `transition-colors`
- 在亮色主题下 `--fg-3` 可能对比度不足,后续如发现可见性问题,要么换 token 要么允许 `kind` 加一个 `muted` 变体

## MessageSurface

目录 `ui/MessageSurface/`(`index.tsx` + `index.css`)。轻量卡片外壳,无角色词。

**查阅时机**:加新「消息 / 卡片」容器,判断「要不要外壳 / 要哪种样式」。

**何时用**:

- 一段内容(用户消息、agent 块、设置卡片)需要卡片化(背景 + 边框 + 圆角 + padding)
- 不想在多处重复写 `bg-surface rounded-md border` 类

**何时不用**:

- 不需要边框背景的轻量容器 — 改用普通 `<div>` + 必要的 padding/margin
- 想分 user / assistant 两种样式 — 不要把语义放在 Surface,放消费方(`UserMessage` / `AssistantMessage`)控制对齐与背景

**API**:

```tsx
<MessageSurface className="…">
  {children}
</MessageSurface>
```

| 项 | 值 |
|---|---|
| 圆角 | 10px(`rounded-lg` 等价) |
| 边框 | `1px solid var(--border)` |
| 背景 | `#1E1E1E`(比 `--app` 亮 9 阶,比 `--surface` 深) |
| 内边距 | `12px` |
| 文字色 | `text-fg`(14px,`text-base`) |

## Editor

目录 `ui/Editor/`(schema / keymap / serialize / placeholder / 样式),对外只从 `ui/Editor` 导出 `Editor`、`EditorProps`、`EditorHandle`。业务无关,不引用 Conversation / store。

**查阅时机**:做新的「输入框 / 表单字段」(多行、富文本、键位定制),或评估是否替换为 `<textarea>`。

**何时用**:

- 多行智能输入(自动高度、Shift-Enter 换行、Enter 提交)
- 需要 IME 友好(中文 / 日文输入法组合过程不打断)
- 需要 history(撤销 / 重做)
- 需要键位定制

**何时不用**:

- 单纯多行输入(用 `<textarea>`);表单字段(过重)
- 单行 input(用 `<input>`)
- 富文本(Markdown / 加粗 / 列表)— 当前 schema 只 paragraph + text,不支持加粗等

**API**:

```tsx
<Editor
  ref={editorRef}
  placeholder="…"
  disabled={false}
  autoFocus={false}
  onChange={(text) => { /* 纯文本,段落间 \\n */ }}
  onSubmit={(text) => { /* Enter;空白不回调;调用方自行 clear */ }}
/>

// EditorHandle: focus() / clear() / getText()
```

**行为**:

- Schema:`doc → paragraph+ → text*`(自写,不用 `prosemirror-schema-basic`)
- Keymap:spread `baseKeymap`,把原 `Enter`(换段)挂到 `Shift-Enter`;`Enter` 调 `onSubmit` 并 `return true`
- 高度:内容盒 `min-height: 22.5px`(1 行 = 15px × 1.5)、`max-height: 225px`(10 行),超出 `overflow-y: auto`;段落 `margin: 0`
- 字号:15px(仅编辑器内容盒,不改全局 `text-base`)
- 滚动条:溢出后 thumb 常显(色 `--border-hover`),不依赖 hover 才显形;未溢出不占位
- 非受控:mount 时建 `EditorView`,不每 render 重建;提交后是否清空由调用方 `ref.clear()`

对话输入外壳(领域组件,在 `components/Composer.tsx`)见 [`docs/web.md` §Composer](web.md#composer)。

## MonacoEditor

目录 `ui/MonacoEditor/`(`index.tsx` + `env.ts` + `themes/`)。封装 `monaco-editor` + `@monaco-editor/react`,业务无关。Vite worker 走包 `exports`:`monaco-editor/editor/editor.worker.js?worker` 等。语法高亮走 `@shikijs/monaco` + `shiki` 的 `createHighlighter`(主题/语言用 bundled 名字)。当前默认主题 `aurora-x`,在 `themes/index.ts` 登记。加主题时在该数组追加名字。编辑器/gutter/minimap 背景覆盖为 `--app`(与扩展区一致);行号前景与当前行行号用同一色,不随光标换行变亮。右侧 minimap 默认开(`side: 'right'`,滑块 `mouseover` 才显)。关闭了 Monaco 语义高亮,避免盖住 Shiki token 色。

**查阅时机**:展示或编辑代码/文本文件,或准备在业务里直接接 Monaco。

**何时用**:

- 文本/代码的只读预览或可编辑缓冲区
- 需要语言高亮(`language` 传 Monaco languageId)

**何时不用**:

- 对话区 Markdown 渲染 → [`MarkdownView`](#markdownview)
- 对话输入 → [`Editor`](#editor)
- 非文本(图片等) → 不要塞进 Monaco,由调用方换 viewer

**API**:

```tsx
<MonacoEditor
  value={text}
  language="typescript"
  path="src/foo.ts"   // 可选,多模型区分
  readOnly={true}     // 默认 true
  className="h-full min-h-0 w-full"
/>
```

| prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | `string` | — | 文档内容 |
| `language` | `string` | `'plaintext'` | Monaco languageId |
| `path` | `string` | — | 多模型 key |
| `readOnly` | `boolean` | `true` | 只读;同时开 `domReadOnly` |
| `className` | `string` | 铺满父级 | 外层容器 |

文件插件通过 `fileKinds.viewer === 'monaco'` 消费本组件,不在插件内再配一份 Monaco。

## PaneHeader

单文件 `ui/PaneHeader.tsx`。子面板顶栏:固定高度 38px,底部分割线,左右 slot。

**查阅时机**:给扩展插件 / 子面板加顶栏,或准备手写 `h-[38px] + border-b`。

**何时用**:

- 一块面板需要固定顶栏(左标题或操作、右 icon)
- 想让高度和底部分割线跟其他插件一致

**何时不用**:

- 壳层 tab 条 → 仍用 `ExtensionTabBar`,不要套 `PaneHeader`
- 需要标题 + chevron 折叠整块内容 → [`DisclosureRow`](#disclosurerow)
- 只要分割线、不要 38px 顶栏 → 裸 `border-b`

**API**:

```tsx
<PaneHeader left={…} right={…} className="…" />
```

| prop | 类型 | 说明 |
|---|---|---|
| `left` | `ReactNode` | 左侧 slot,可空 |
| `right` | `ReactNode` | 右侧 slot,可空 |
| `className` | `string` | 透传到外层 |

**视觉**:`h-[38px] shrink-0 items-center`,`border-b border-border`,`pl-2 pr-3`(右侧与壳层 `ExtensionShellHeader` 的 `pr-3` 对齐);左右用 `justify-between`。

## IconButton

单文件 `ui/IconButton.tsx`。图标按钮,统一变体 / 尺寸 / 禁用态。

**查阅时机**:加图标按钮(侧栏 action、ProjectSection header toggle、空状态 CTA),或评估是否用裸 `<button>`。

**何时用**:

- 按钮只显示一个图标(没有可见文字)
- 想统一 hover / active / disabled 视觉
- 想保证 `type='button'`(防止 form 内误提交)

**何时不用**:

- 按钮带可见文字 → 普通 `<button>`(Material/Tailwind 已有 `text-sm` 等可用)
- 复杂下拉菜单触发器 → [`Popover`](#popover) 自带触发器

**API**: `variant: ghost | solid`,`size: sm | md`(默认 `md` 固定命中区 26×26,与壳层展开/收起 toggle 同尺寸;图标默认 14px,调用方用 `[&_svg]:h-* [&_svg]:w-*` 改视觉大小,不要改按钮尺寸),`disabled` 自动降透明 + 禁交互,`type` 默认 `button`,透传其他原生属性(`aria-pressed` / `name` / `value` / `tabIndex` 等)。

提示走内置 [`Tooltip`](#tooltip),不写原生 `title` 属性:

| prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `title` | `ReactNode` | — | 提示内容。`null` / `undefined` / `false` / `''` 时不展示。字符串同时作为默认 `aria-label` |
| `tooltipPlacement` | `Placement` | `top` | `@floating-ui/react` 的 `Placement`，与 [`Popover`](#popover) 相同 |
| `tooltipDelay` | `number` | `400` | 悬停多少毫秒后打开 |

`title` 不是字符串时,无障碍名称用调用方传入的 `aria-label`。

## Input

单文件 `ui/Input.tsx`。单行文本框:三种高度、清空、前后缀、框内字数、状态边框,以及输入框下方的提示。

**查阅时机**:表单或设置里要一个普通文本框,或评估是否写裸 `<input>` 再拼清空按钮、字数和错误边框。

**何时用**:

- 单行文本,要统一高度 / focus / placeholder
- 需要清空、前后缀、字数、`error` / `warning` / `success`,或框下提示
- 后续表单要把校验文案放在控件下,并可事先留出一行高度

**何时不用**:

- 带搜索图标、回车即搜索 → [`SearchInput`](#searchinput)
- 富文本、多行提交 → [`Editor`](#editor) + `Composer`
- 只要一个没有这些能力的框 → 裸 `<input>` 即可

**API**:透传 `InputHTMLAttributes<HTMLInputElement>` 中除 `size` / `prefix` / `value` / `defaultValue` / `onChange` 外的属性(`readOnly`、`name`、`autoFocus`、`type`、`onBlur` 等走 rest)。原生 `size`(字符宽度)让给视觉尺寸。

| prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | `string` | — | 受控值;**传了就走受控** |
| `defaultValue` | `string` | — | 非受控初始值 |
| `onChange` | `(value: string) => void` | — | 每次输入变化,只传字符串 |
| `onPressEnter` | `(value: string) => void` | — | 按下 Enter 时触发。不 `preventDefault`,表单提交仍会继续 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | sm 24px,md 30px(与 SearchInput / Select 同高),lg 36px |
| `variant` | `'filled' \| 'transparent'` | `'filled'` | `'filled'` 有边框和 `bg-surface`。`'transparent'` 保留边框,中间透明;焦点只加深边框,不铺背景 |
| `disabled` | `boolean` | — | 整框降透明并禁交互;清空按钮不出现 |
| `allowClear` | `boolean` | `false` | 值非空、且非 `disabled` / `readOnly` 时,在右侧显示清空 |
| `prefix` / `suffix` | `ReactNode` | — | 框内前后内容,图标或短文本 |
| `showCount` | `boolean` | `false` | 字数画在框内最右侧 |
| `maxLength` | `number` | — | 写到原生 input 上,`onChange` 前再截一次。和 `showCount` 同时存在时显示 `6 / 20`;只有 `showCount` 时显示 `6` |
| `status` | `'error' \| 'warning' \| 'success'` | — | 边框和输入文字的颜色;`error` 时 `aria-invalid`。焦点仍保持该颜色 |
| `hint` | `ReactNode` | — | 框下提示。有内容时接到 `aria-describedby` |
| `hintStatus` | 同 `status` | 跟随 `status` | 提示自己的颜色 |
| `hintReserve` | `boolean` | `false` | `true` 时提示槽始终占一行,空文案也留高;`false` 时绝对贴在框下,不推动后面的字段 |
| `className` | `string` | — | 透传到外层 wrapper |

```tsx
<Input placeholder="名称" />

<Input variant="transparent" placeholder="只有边框" />

<Input allowClear defaultValue="可清空" onChange={setName} />

<Input showCount maxLength={20} prefix={<SearchIcon />} />

<Input status="error" hint="至少 2 个字符" hintReserve />

// 提示不占位,盖在框下
<Input status="warning" hint="格式不对" />
```

**视觉**:

- `'filled'`(默认):边框 `border-border-hover`、`bg-surface`,焦点边框略加深、背景到 `surface-hover`,与 [`SearchInput`](#searchinput) 的 bordered 一致。
- `'transparent'`:同一条边框,中间 `bg-transparent`。焦点只加深边框,背景保持透明。状态色仍画在边框和文字上。
- 字数在框内最右(`text-fg-3`、`tabular-nums`)。从右往左是字数、`suffix`、清空按钮,清空出现时数字仍留在框内。
- 清空是 14px 圆标,颜色在 `fg-3` 和 `fg-disabled` 之间,悬停升到 `fg-2`。中间的叉是镂空,能透出输入框背景。只有值非空时出现。
- 提示约 160ms 透明度 + 约 2px 上移,不做高度动画。`hintReserve` 的一行高度一直在;不占位时只淡入淡出。

**踩坑备忘**:

- Enter 跳过 IME 组字中(`!e.nativeEvent.isComposing`),中文输入法回车选词不会触发 `onPressEnter`。
- 受控时如果 `onChange` 没有把 `value` 写回去,输入看起来没变化。
- 字数按 JS 字符串长度,和原生 `maxLength`(UTF-16 码元)一致。
- `hint` 每次渲染都换成新的 React 元素会重跑淡入。文案用字符串,或把元素提到渲染外面。
- 清空按钮 `tabIndex={-1}`,Tab 不会从输入框跳到它上面。

## SearchInput

单文件 `ui/SearchInput.tsx`。左侧带搜索图标的输入框,统一圆角 / 字号 / hover / focus 视觉。

**查阅时机**:加搜索框(设置面板搜索栏、列表过滤条),或评估是否写裸 `<input>` + 绝对定位 icon。

**何时用**:

- 需要左侧带搜索图标的输入框
- 想统一 hover / focus / placeholder 视觉
- 想让父容器通过 `px-1.5` 等外边距控制整体位置,组件内部自己处理 icon 定位

**何时不用**:

- 不需要搜索图标 → [`Input`](#input);连清空、字数、状态都不要时,裸 `<input>` 即可
- 需要清空 / 前后缀 / 字数 / 状态边框 / 框下提示 → [`Input`](#input)
- 富文本输入 → [`Editor`](#editor) + `Composer`

**API**:透传 `InputHTMLAttributes<HTMLInputElement>` 中除 `value` / `defaultValue` / `onChange` 外的全部属性,以下为本组件专有契约:

| prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | `string` | — | 受控值 |
| `defaultValue` | `string` | — | 非受控初始值 |
| `onChange` | `(value: string) => void` | — | 每次输入变化(仅传字符串,不是事件) |
| `onSearch` | `(value: string) => void` | — | 按下 Enter / 点击搜索 icon 时触发,带当前 value |
| `iconPosition` | `'start' \| 'end'` | `'start'` | 搜索 icon 位置,start = 输入框前、end = 输入框后 |
| `variant` | `'bordered' \| 'borderless' \| 'ghost'` | `'bordered'` | 视觉变体。`'bordered'` 有边框 + `bg-surface`,焦点升级;`'borderless'` 无边框 + 透明 bg,焦点换 bg;`'ghost'` 无边框 + 透明 bg,焦点也不换 bg(只换文字色) |
| `showIcon` | `boolean` | `true` | 是否渲染搜索 icon。`false` 时 `iconPosition` 被忽略,padding 收到 `pl-2.5 pr-2.5` |
| `placeholder` | `string` | — | 占位文案 |
| `className` | `string` | — | 透传到外层 wrapper |

```tsx
<SearchInput placeholder="搜索设置" />

// 受控 + 搜索回调
const [q, setQ] = useState('')
<SearchInput value={q} onChange={setQ} onSearch={(v) => fetch(v)} />

// icon 在尾部
<SearchInput iconPosition="end" placeholder="过滤会话" />

// 非受控 + 默认值
<SearchInput defaultValue="init" onSearch={...} />

// 无边框,放进下拉/抽屉等已带外框的场景(focus 时有 bg 反馈)
<SearchInput variant="borderless" placeholder="过滤会话" />

// 极简无边框(focus 时也无 bg 变化,只换文字色),用于外层已有足量视觉的场景
<SearchInput variant="ghost" placeholder="过滤会话" />

// 不要 icon,纯文本输入
<SearchInput showIcon={false} variant="ghost" placeholder="过滤..." />
```

**对齐约定**:外层 wrapper 用 `left-2.5` / `right-2.5` 定位 icon,输入框 `pl-9` / `pr-9` 给图标让位。配合消费方外层 `px-1.5` 的 `w-full` 容器,可与同侧 `SidebarActions` 风格按钮的图标 / 文字左对齐同列。

**视觉**:

- `'bordered'`(默认):自带 `border border-border bg-surface`,hover / focus 时边框升级到 `border-border-hover`,bg 升级到 `surface-hover`。
- `'borderless'`:无边框 + 透明 bg,融入外层容器;focus 时仅换 bg 到 `surface`,文字升到 `text-fg`。用于 [`Select`](#select) 下拉 / 抽屉等已自带外框的场景。
- `'ghost'`:无边框 + 透明 bg,focus 时**也不换 bg**,只把文字升到 `text-fg`。视觉最克制,适合外层已经有足够视觉层级、不要搜索框抢戏的场景。

**踩坑备忘**:

- Enter 触发搜索时会跳过 IME 组合中(`!e.nativeEvent.isComposing`),中文 / 日文输入法回车选词不会误触发搜索。
- icon 用 `<button>` 渲染但 `tabIndex={-1}`,避免 Tab 时把焦点从输入框拽走;屏幕阅读器仍能朗读为「搜索」按钮。
- `onChange` 故意只传 `value: string` 而非 `ChangeEvent`,比原生更省事;需要事件对象(如取 `target.name`)的消费方用 `onKeyDown` / 自定义 prop 走 `...rest`。

## SettingGroup

单文件 `ui/SettingGroup.tsx`。设置面板里的分组卡片:可选小标题 + 圆角外壳。**只提供外壳,行内每一项的版式由消费方自己写**。

**查阅时机**:加设置面板的分组卡片,或评估是否写裸 `<section rounded-xl border bg-sidebar>` + `<h2>`。

**何时用**:

- 需要「小标题 + 卡片」组合(类似 Cursor 的 "Agent Conversations" / "Colors")
- 行内每一项的版式差异较大(开关 / 滑块 / 下拉 / 数字步进 / 自定义),不适合抽一个通用 row 组件

**何时不用**:

- 不需要小标题、卡片只是一坨设置项 → 直接 `<div rounded-xl border bg-sidebar>`
- 行内版式统一且有复用需求 → 在 Setting 域内抽一个 `SettingRow`,而不是塞进 `ui/`
- 不是设置场景(普通文章卡片 / 模态框内容) → 用 [`MessageSurface`](#messagesurface) 或自己的卡片

**API**:

| prop | 类型 | 说明 |
|---|---|---|
| `title` | `ReactNode` | 可选小标题,显示在卡片外上方;不传就不渲染标题 |
| `children` | `ReactNode` | 直接子节点会被卡片容器按顺序渲染;**第 2 个及之后的直接子节点之间会自动插入一个 `<div role="separator" />` 分割线** |
| `className` | `string` | 透传到外层 `<section>` |

```tsx
<SettingGroup title="Agent Conversations">
  <ToggleRow label="自动滚动" />
  <SliderRow label="代码字号" />
  <StepperRow label="UI 字号" />
</SettingGroup>

// 不带标题,直接一坨
<SettingGroup>
  <DropdownRow label="Theme" />
</SettingGroup>
```

**踩坑备忘**:

- 分割线是组件**自己插入的 `<div role="separator">` 节点**,不是给子节点加 `border`,所以子节点自身有边框 / 边距也不会受影响。
- 单子节点 / 零子节点时无分割线。
- 通过 `Children.toArray` 读 children,所以消费方传 `<>{rows}</>` 数组或 `.map(...)` 都会按顺序展开,原有 key 会被保留。

## SettingRow

单文件 `ui/SettingRow.tsx`。设置面板里**单行**的左右版式:左 = 主标题 + 副描述,右 = 自定义控制区(slot)。本身**不带上下 padding**,行间距靠外层 [`SettingGroup`](#settinggroup) 的分割线 `my-3` 撑开。

**查阅时机**:在 SettingGroup 内写一行(开关 / 滑块 / 下拉 / 步进器 / 任意控制),或评估是否写裸 `<div flex justify-between>` 三层嵌套。

**何时用**:

- 行内需要 label + description + 一个控制 widget
- 控制 widget 是真正可交互的(Slider / Switch / Select / NumberStepper)
- 行间距由 SettingGroup 的分割线 + margin 控制,不需要自己加 padding

**何时不用**:

- 只是描述一段文字,没有控制 → `<div>` 加 text 即可
- 控制 widget 自己已经包了 label + description → 直接用 widget,别再套一层
- 行间距要求特殊(很密 / 很疏) → 自己写 row,不要硬塞 SettingRow
- 不是设置场景(表格行 / 列表项 / 表单 row) → 自己写

**API**:

| prop | 类型 | 说明 |
|---|---|---|
| `label` | `ReactNode` | 主标题(左上一行) |
| `description` | `ReactNode` | 可选副描述(左下一行,`text-sm text-fg-3`) |
| `children` | `ReactNode` | 右控制区(slot) |
| `className` | `string` | 透传到外层 flex 容器 |

```tsx
<SettingRow label="Tool Call Density" description="Adjust how much detail is shown for tool calls">
  <Slider value={density} onChange={setDensity} />
</SettingRow>

<SettingRow label="Code Block Word Wrap" description="Wrap long lines in Agent conversation code blocks">
  <Switch checked={wrap} onChange={setWrap} />
</SettingRow>
```

**踩坑备忘**:

- 上下无 padding,放进 [`SettingGroup`](#settinggroup) 时行间距由 group 的 `<div role="separator" className="my-3 h-px" />` 提供。如果放进不带分割线的容器,行会挤在一起。
- 左右用 `items-start` 顶对齐,允许消费方的控制 widget 比左边的文字高度更高(多行 desc / slider 带副标签)。
- 控制 widget 本身应自带宽度;外层只在右侧容器加 `shrink-0` 保证 widget 不被 label 挤窄。

## Switch

单文件 `ui/Switch.tsx`。开关(on/off):圆角胶囊 + 圆形 thumb,on 时 `bg-success` 绿色,off 时 `bg-fg-disabled` 中灰;thumb 用 `translate-x` 在 200ms 内位移。

**查阅时机**:在 [`SettingRow`](#settingrow) 里放 on/off 控件,或评估是否写裸 `<button role="switch">` + 自己拼 thumb 位移。

**何时用**:

- 设置 / 偏好场景的开关键
- 想直接拿到 `(checked: boolean) => void` 的简洁回调(而不是 `ChangeEvent<HTMLInputElement>`)
- 颜色直接走项目 token(`bg-success` / `bg-fg-disabled`),无需自己调

**何时不用**:

- 需要 indeterminate 状态(三态)→ 自己写,Switch 只支持二态
- 颜色和项目强调色不一致(品牌方要求橙色 / 紫色开关)→ 直接写,Switch 写死 success
- 需要原生 form 集成(`<input type="checkbox">` 的 name / value / form 提交)→ 用原生 checkbox + 视觉包装

**API**:

| prop | 类型 | 说明 |
|---|---|---|
| `checked` | `boolean` | 受控值;**传了就走受控** |
| `defaultChecked` | `boolean` | 非受控初始值;`checked` 没传才生效 |
| `onChange` | `(checked: boolean) => void` | 切换时触发,直接拿到布尔值 |
| `disabled` | `boolean` | 禁用,自动降透明 + 禁交互 |
| `ariaLabel` | `string` | 屏幕阅读器朗读(放 [`SettingRow`](#settingrow) 时建议传 row 的 label) |
| `className` | `string` | 透传到外层 button |

```tsx
// 受控
<Switch checked={wrap} onChange={setWrap} ariaLabel="Code Block Word Wrap" />

// 非受控
<Switch defaultChecked onChange={(v) => save(v)} />

// 只读 / 不需回调
<Switch defaultChecked />
```

**踩坑备忘**:

- `role="switch"` + `aria-checked` 已设好,屏幕阅读器会朗读「开关 打开 / 关闭」。
- 点击后主动 `blur()` 避免 switch 抢焦点,保持表单焦点流自然。
- thumb 位移 `translate-x-4` (16px,pill 32 - thumb 14 - 左右各 2px padding = 16),左右对称,跟 input 同步缩放后的尺寸对齐。

## NumberStepper

单文件 `ui/NumberStepper.tsx`。数字步进器:圆角 pill 容器,内三段(`-` / 数字 / `+`),**只外层有边框,内部不分隔**;两端的按钮复用 [`IconButton`](#iconbutton)(ghost,sm,`px-2`,图标缩到 12px),图标用项目 `MinusIcon` / `PlusIcon`。中间数字 `min-w-[3rem]` 防位数变化挤压,`aria-live="polite"` 让屏幕阅读器感知变化。

**查阅时机**:在 [`SettingRow`](#settingrow) 里放离散整数 / 小数步进(字号、行距、并发数、采样率等),或评估是否写裸 `<div flex>` + 两个 button + span 三段散落。

**何时用**:

- 步长固定、值有自然上下界(整数或可量化的小数)
- 想直接拿到 `(value: number) => void` 的简洁回调
- 默认 26px 高度,放进 [`SettingRow`](#settingrow) 右槽与 `Select` / `Switch` 自然同高

**何时不用**:

- 连续范围选择(想拖拽看所有可能)→ 自己写 range input
- 输入值域很大 / 不可枚举(>1000 步)→ 直接给 `<input type="number">` 或文本框
- 需要原生 form 集成(name / value / form 提交)→ 用原生 number input + 视觉包装
- 多值联动(同时调几个相关字段)→ 自己写 panel,NumberStepper 只管单字段

**API**:

| prop | 类型 | 说明 |
|---|---|---|
| `value` | `number` | 受控值;**传了就走受控** |
| `defaultValue` | `number` | 非受控初始值;`value` 没传才生效 |
| `onChange` | `(value: number) => void` | 步进时触发,值已钳制到 `[min, max]` |
| `min` | `number` | 下界;到边界时 `-` 按钮 disabled |
| `max` | `number` | 上界;到边界时 `+` 按钮 disabled |
| `step` | `number` | 步长,默认 `1` |
| `disabled` | `boolean` | 整体禁用,两端按钮都不可点 |
| `ariaLabel` | `string` | 透传到两个按钮(`"X 减小"` / `"X 增大"`),放 [`SettingRow`](#settingrow) 时建议传 row 的 label |
| `className` | `string` | 透传到外层 pill 容器 |

```tsx
// 受控
<NumberStepper value={fontSize} onChange={setFontSize} min={10} max={20} ariaLabel="UI 字号" />

// 非受控
<NumberStepper defaultValue={13} min={1} max={99} />

// 小数步进
<NumberStepper value={opacity} onChange={setOpacity} min={0} max={1} step={0.05} ariaLabel="透明度" />
```

**踩坑备忘**:

- 中间数字段固定 `min-w-[3rem]` `px-2`,10 以内和 100 以上的数字不会让 pill 宽度跳变。
- 端按钮 `px-2` + 图标缩到 12px(`&_svg]:h-3 [&_svg]:w-3`):点击区不变(~24px),但视觉留白更舒展。
- 受控模式:若 `onChange` 内部没更新 `value`,按钮看起来"按了没反应"——这是 React 受控组件语义,不是 bug。
- 边界按钮 disabled 时 `onChange` 不调用;若需要"到边界也能通知",自己在外层 onChange 里 clamp 后再写。
- 外层 `overflow-hidden` 让两端按钮的 hover 高亮不会越出 pill 圆角;**内部不加分隔线**(避免边框 + 分割线两层视觉噪音),依赖外层 pill 的边框区分三段。

## ProgressBar

单文件 `ui/ProgressBar.tsx`。水平拖拽滑块:track + 圆形 thumb + 可选数值槽位。`role="slider"` + `aria-valuemin/max/now` + 键盘(`←`/`→`/`Home`/`End`/`PageUp`/`PageDown`)+ pointer capture 拖拽。

**查阅时机**:在 [`SettingRow`](#settingrow) 里放连续范围控件(百分比 / 字号 / 透明度 / 任意 min–max),或评估是否写裸 `<input type="range">`。

**何时用**:

- 连续范围选择(想直接拖到任意点,而不是 ±1 步进)
- 想直接拿到 `(value: number) => void` 的简洁回调(而不是 `ChangeEvent<HTMLInputElement>`)
- 想让 thumb / fill / track 颜色自动跟随 token(`bg-fg-3` / `bg-border-hover`)
- 想统一键盘 / 触摸 / pointer capture / 数值槽位格式化(`renderValue` 返回 `ReactNode`)

**何时不用**:

- 离散整数 / 小数步进 → [`NumberStepper`](#numberstepper)
- 二态开关 → [`Switch`](#switch)
- 单选下拉 → [`Select`](#select)
- 需要原生 form 集成(`<input type="range">` 的 `name` / `value` / form 提交)→ 用原生 `range` + 视觉包装
- 垂直方向 / 多 thumb(range selection)→ 自己写,本组件只支持单值水平

**API**:

```tsx
<ProgressBar
  value={progress}                  // 受控;传了就走受控
  defaultValue={0}                  // 非受控初始值
  onChange={setProgress}            // 每次变化(已 clamp + snap 到 step)
  min={0}                           // 下界,默认 0
  max={100}                         // 上界,默认 100
  step={1}                          // 步长,默认 1
  disabled={false}
  showValue={true}                  // 是否渲染数值槽位,默认 true
  renderValue={(v, p) => `${p}%`}   // 自定义槽位内容(返回 ReactNode)
  valuePosition="after"             // 'before' | 'after',默认 'after'
  block={false}                     // 外层改 `flex w-full`,占满父容器
  width={140}                       // 显式宽度(number = px,string 透传如 '50%' / '10rem');默认 wrapper 宽度 100
  filled={true}                     // 拖动过的部分是否用颜色填充(默认 true);`false` 时只剩 thumb 指示位置,track 统一 `bg-border-hover`
  ariaLabel="…"                     // 屏幕阅读器朗读
  className="…"                     // 透传到外层 wrapper
/>
```

| 项 | 值 |
|---|---|
| 外层 | 默认 `inline-flex h-[26px] w-[100px] items-center gap-2`(与 `NumberStepper` / `Select` 同高,放进 `SettingRow` 右槽自然对齐);`block` 或 `width` 任一为 true 时切换为 `flex h-[26px] items-center gap-2`,`block` 再追加 `w-full`,`width` 通过 inline `style.width` 写入 |
| 数值槽位 | `text-right text-md tabular-nums text-fg-2`(`tabular-nums` 让数字等宽;**无** `min-w`,槽位按内容自适应) |
| Track | 相对定位 `flex h-3 flex-1`,背景 `absolute inset-x-0 h-1 bg-border-hover`,**可选**填充 `absolute left-0 h-1 bg-fg-3`(宽度 = `value` 对应的 `percent`,`filled=false` 时不渲染) |
| Thumb | 12×12 `relative h-3 w-3 rounded-full bg-fg-2 shadow`,`style={{ left: \`calc(${pct}% - 6px)\` }}` 让 thumb 中心对齐百分位;hover / focus → `bg-fg-bright`(默认 `bg-fg-2` 比 fill `bg-fg-3` 亮一档,与填充色有区分度) |
| 交互 | `onPointerDown` 起抓 + `setPointerCapture` + `updateFromClientX`;`onPointerMove` 在捕获态才更新;`onPointerUp` / `onPointerCancel` 释放 |
| 键盘 | `←`/`↓` `-step`、`→`/`↑` `+step`、`Home` → `min`、`End` → `max`、`PageUp`/`PageDown` ±`Math.max(step, (max-min)/10)`(再 snap) |
| Disabled | 整体 `opacity-50`;pointer / keydown 直接 return;`tabIndex={-1}` |
| 受控 / 非受控 | `isControlled = value !== undefined`,模式同 [`NumberStepper`](#numberstepper) |
| 钳制 | `clamp(rawCurrent, min, max)` 用于显示;`commit` 时也 `clamp(snap(...), min, max)`,消费方拿到的永远是区间内 + step 对齐值 |

**实现要点**:

- `valueFromPointer(ratio, lo, hi, step)` 把 `[0, 1]` 的鼠标位置算成 `(lo + ratio * (hi - lo))` → `snap` → `clamp`。所有计算在模块作用域的纯函数里,组件只负责事件绑定 + state 写回。
- `commit(next)` 是唯一的写路径:clamp 后若等于当前值直接 return(避免重复 `onChange`);否则 `setInternal`(非受控)+ `onChange?.(clamped)`。
- 受控模式下父组件传入越界值时,thumb 用 `clamp(rawCurrent, min, max)` 显示,不会"飞出去";但不会反向通知父组件修正(由父组件自行管理状态)。

**与 token 的配合**:track / fill / thumb 颜色全部走 CSS 变量(`bg-border-hover` / `bg-fg-3` / `bg-fg-bright`),跟随主题切换。消费方若要换色,通过 `className` 传 `[&_.bg-fg-3]:bg-accent` 之类的子选择器覆盖 — 不在组件 API 里开 per-instance 颜色 prop。

**踩坑备忘**:

- 不要给 `<input type="range">` 套样式替代本组件 — 浏览器原生 thumb 在 Chrome / Safari / Firefox 视觉差很大,且 pointer capture 需要自己粘。
- 受控 + 父组件 `value` 没更新,thumb 看起来"按了没反应"——这是 React 受控组件语义,不是 bug。父组件必须在 `onChange` 里 `setState`。
- 拖拽时浏览器默认会选中 track 周围文本,`touch-none select-none` + `e.preventDefault()` 双重阻断。
- 右键点击(`e.button !== 0`)不应触发移动;本组件 guard 在 pointerdown 处(仅鼠标指针类型生效,触摸 / 笔不受影响)。
- `PageUp`/`PageDown` 的步长 `Math.max(step, (max - min) / 10)`:在窄区间(如 `min=0, max=5`)`step=1` 时不会小于 step,避免 `snap` 把结果四舍五入回 current 导致 no-op;在默认 0–100 时仍按 10% 跳。
- thumb 在 0% / 100% 边缘会有一半溢出 track(中心对齐 edge)。这是常见 UX 约定,本组件不特意内缩 — 若需要严格内缩,改 thumb `left` 为 `calc(${pct}% ) + 半 thumb 内偏移`,但需要重新算 fill 边界,得不偿失。
- `block` 需要父容器有显式 / 可计算的宽度才能"占满整行":放进 `SettingRow` 右槽(`shrink-0` content-sized)时 `block` 不会变宽 — 这时改用 `width={N}` 给具体像素。`block` 适用于 Modal / Drawer / 独立全宽行等父容器已经有 width 的场景。

## Select

单文件 `ui/Select.tsx`。下拉选择器,统一**四种组合**:数据来源(`options` 内联 vs `loadOptions` 异步接口)× 是否可搜索(`searchable`)。底层是 [`@floating-ui/react`](https://floating-ui.com/)(定位 / 翻转 / portal)+ [`cmdk`](https://cmdk.paco.me/)(键盘导航 / ARIA),filter 自己做。

**查阅时机**:任何「单选下拉」场景(设置项 / 列表过滤 / 远程搜索),或评估是否写裸 `<select>` 或自造 listbox 浮层。

**何时用**:

- 选项 ≤ 20 且穷尽 → `options={[...]}` 内联
- 选项 ≤ 100 且能一次拿全,但用户需要搜 → `options={[...]}` + `searchable` 本地过滤
- 选项 ≥ 100 或需服务端过滤 / 排序 / 权限 → `loadOptions={...}` + 可选 `searchable` 走接口
- 想统一 a11y / 键盘 / 滚动条主题 → 直接用,不必自写

**何时不用**:

- 多选 → Select 只支持单选,多选用 `<input type="checkbox">` 列表或其他组件
- 树形 / 级联 → 用 `Menu` / `Tree`,Select 只支持扁平列表
- 原生 form 集成(`<select>` 的 `name` / `form` 提交)→ 用原生 `<select>` 加样式包装
- 选项 < 5 个且不需要搜索 → 直接用 `Radio` 行更轻

**API**:

| prop | 类型 | 说明 |
|---|---|---|
| `value` | `V` | 受控值;传了就走受控 |
| `defaultValue` | `V` | 非受控初始值;`value` 没传才生效 |
| `onChange` | `(value: V) => void` | 选中时触发,直接拿到 `V`(不是 event) |
| `placeholder` | `string` | 未选中时的占位文案,默认「选择...」 |
| `disabled` | `boolean` | 禁用 trigger |
| `className` | `string` | 透传到 trigger 按钮;**给 trigger 设固定宽**(如 `w-[200px]`)就触发省略号截断 |
| `options` | `SelectOption<V>[]` | **静态模式**:固定列表,无接口调用 |
| `loadOptions` | `(p) => Promise<{items, hasMore}>` | **懒加载 / 搜索模式**:消费方提供数据源 |
| `pageSize` | `number` | 每次 `loadOptions` 的 `limit`,默认 20 |
| `searchable` | `boolean` | 显示顶部搜索框(配 `variant="ghost" showIcon={false}` 的 [`SearchInput`](#searchinput)) |
| `debounceMs` | `number` | 搜索输入去抖,默认 200ms |
| `placement` | `Placement`(floating-ui) | 期望方位,`flip()` 中间件在放不下时自动反向。默认 `'bottom-start'`(`-start`/`-end` 控制相对 trigger 的左/右对齐) |
| `dropdownWidth` | `'trigger' \| number` | 下拉面板宽度策略:`'trigger'`(默认)跟随 trigger 宽度;`number` 指定固定像素宽度,与 trigger 解耦 |

`SelectOption<V> = { value: V; label: string; disabled?: boolean }`

**四种模式组合**:

| `options` | `loadOptions` | `searchable` | 行为 |
|---|---|---|---|
| ✓ | — | — | static 全量渲染 |
| ✓ | — | ✓ | **static+search**,用 `displayItems = items.filter(it => label.includes(query))` 本地过滤 |
| — | ✓ | — | lazy 接口拉,无搜索框,滚到底加载 |
| — | ✓ | ✓ | **lazy+search**,输入去抖后重置 offset 再查 |

**loadOptions 协议**:

```tsx
type Params = { query: string; offset: number; limit: number }
type Result<V> = { items: SelectOption<V>[]; hasMore: boolean }

const loadOptions = async ({ query, offset, limit }: Params): Promise<Result<V>> => {
  const res = await fetch(`/api/items?q=${query}&offset=${offset}&limit=${limit}`)
  return res.json()
}

<Select loadOptions={loadOptions} searchable pageSize={20} />
```

**键盘 / ARIA**:键盘导航(↑↓ Enter Esc Home End typeahead)走 cmdk;`role="listbox"` / `role="option"` / `aria-selected` 走 cmdk + floating-ui 的 `useRole(context, { role: 'listbox' })`。我们不重新实现。item 视觉高亮不用 `data-[selected]`(cmdk 的偶发 `data-selected` 会误触发),改成显式 React state(`item.value === current` 决定 selected,`hoveredValue` 决定 hover),完全可控。

**踩坑备忘**:

- **不要用 `<Command.Input asChild>`** — cmdk 的 asChild 实际上不生效,Command.Input 总是渲染自己的裸 `<input>`,SearchInput 不会挂上,会触发 `Cannot read 'value' of undefined`。改为直接 `<SearchInput value={query} onChange={setQuery} variant="ghost" showIcon={false} />` 手动控制 state。
- 搜索 filter 自己写(`displayItems` derived from items + query),不需要 `Command.Input` 来桥接 cmdk 的 search state;`shouldFilter={false}` 关掉 cmdk 自带 filter。
- 列表 `max-height: 192px`(6 行 × 32px)+ 每行 `h-[30px]`,超出走 `scrollbar-none`(完全隐藏,跨浏览器)— 不显示滚动条轨道,但仍可滚动触发 `loadOptions` 增量。
- **trigger 默认 `inline-flex` 自适应内容宽度**(选中几个字就多宽,不会撑满父容器)。想给 trigger 设固定宽,直接在 `className` 传 `w-[200px]` 等,选中文字过长会自动 `truncate` 省略号。
- 下拉面板宽度默认 `dropdownWidth='trigger'`,与 trigger 等宽;传数字(如 `dropdownWidth={200}`)可独立指定下拉宽度,与 trigger 宽度解耦(常见于 trigger 窄、下拉宽展示完整 label 的场景)。
- `placement` 是 floating-ui 的 Placement 枚举,`-start`/`-end` 后缀控制相对 trigger 的左/右对齐,`flip()` 中间件在放不下时自动反向。
- 「没数据」/「加载中」/「没有更多了」三种状态由组件内置,文本居中 + `text-xs`,不需要消费方写。
- item 的 hover bg 不走 CSS `:hover`(曾在 React 19 strict mode + FloatingPortal 出现「卡住」bug),改用 `useState(hoveredValue)` + `onPointerEnter/Leave` 显式控制。

## Popover

封装自 `@floating-ui/react`(`useFloating` + `useClick` / `useHover` + `useDismiss` + `useRole`),负责"算坐标 + 处理交互"这类底层逻辑,样式由 Popover 自行接管。

**查阅时机**:加 dropdown / context menu / 信息卡浮层,或评估直接用 `@floating-ui/react`。短 hover 文案用 [`Tooltip`](#tooltip),不要在这里手写 `role="tooltip"`。

**何时用**:

- 需要点击或 hover 触发的浮层
- 需要自动定位、翻转、滚动跟随
- 想统一浮层视觉(背景、边框、圆角、阴影、字号、z-index)

**何时不用**:

- 短 hover 提示 → [`Tooltip`](#tooltip);图标按钮直接用 [`IconButton`](#iconbutton) 的 `title`
- 遮罩对话框 → [`Modal`](#modal)。Setting 那种整页覆盖仍自己写 `fixed inset-0`(参考 [`web.md` §Setting](web.md#布局))
- 不需要浮层定位 → inline 展开

**API**:

```tsx
<Popover
  trigger={['click']}            // 触发模式,默认 ['click'];支持 ['click'] / ['hover'] / ['click','hover']
  placement="bottom-start"        // 12 种 Placement:top/bottom/left/right × start/center/end;默认 'bottom-start'
  offset={6}                      // 主轴偏移(距 trigger),默认 6
  crossOffset={0}                 // 十字轴偏移(对齐微调),默认 0
  interactive={false}             // hover 模式下,浮层里是否有可交互内容(按钮/链接等);默认 false
  openDelay={0}                   // hover 打开延迟(ms),默认 0。大于 0 时不再用 restMs: 50
  open / onOpenChange             // 受控用法;二者都给才走受控,否则内部 state
  role="dialog"                   // 浮层 ARIA role,默认 'dialog';Select 等 listbox 类场景传 'listbox'
  className                       // 透传到浮层容器
  content={<div>浮层内容</div>}   // 浮层内容(必填)
>
  <button>触发器</button>          // children,单个 ReactElement(必填)
</Popover>
```

**浮层样式**(内置,无需额外配置):

| 项 | 值 | 来源 |
|---|---|---|
| 背景 | `bg-sidebar` (`#252525`) | 与 Sidebar 同色,"沉下去" |
| 边框 | `border-border-hover` (`#3F3F3F`) | 比背景亮一档,对比明显 |
| 圆角 | `rounded-lg` (10px) | §34 |
| 阴影 | `shadow-lg` | 微凸 |
| 字号 | `text-sm` (12px) | §3.1 |
| 文字色 | `text-fg-2` | 次级文字 |
| z-index | `z-[99]` | 全局最高一档(预留 Setting 等覆盖层用更高值) |

> 内 padding 不固定 —— 由 `content` 自己控制(popover 内容差异巨大,菜单用 `p-1`,信息卡用 `p-3`)。短提示的 `px-3 py-1.5` 在 [`Tooltip`](#tooltip) 里。

**interactive 模式**:

`useHover` 默认 `delay.close = 0`,光标离开 trigger 同步关闭,早于 `mouseenter` 浮层,所以浮层里没法放交互元素。设 `interactive` 后:

- `delay: { close: 100 }` — 给 100ms 让 `mouseenter` 浮层先清除关闭定时器
- `move: false` — 避免 `mousemove { once }` 的边角行为干扰

> 仅在 `trigger` 含 `'hover'` 时生效。click 模式不受影响(click 模式下点浮层内不会自动关)。

**定位与翻转**:

- `whileElementsMounted: autoUpdate` — 滚动 / 窗口 resize 时浮层自动跟随
- `flip()` — 视口碰撞自动反向(top ↔ bottom, left ↔ right)
- `shift({ padding: 4 })` — 与视口边缘保持 4px 间距

**踩坑备忘**:

- 触发器(`children`)必须是单个 ReactElement;`cloneElement` 需要 `ref` 注入。如果传了 fragment / 数组 / 字符串,运行时直接 throw。
- 触发器的原始 `ref` 会被保留(函数式 / object 式都支持)。
- 浮层挂在 `document.body`(`FloatingPortal` 默认),脱离任何 `overflow:hidden` 祖先。
- `role` 默认 `'dialog'`。listbox / menu 等场景必须传对应 role,否则屏幕阅读器会朗读成「对话框」。底层用 `@floating-ui/react` 的 `useRole(context, { role })` 接管。短提示不要传 `role="tooltip"`,用 [`Tooltip`](#tooltip)。
- `openDelay` 默认 `0`,此时 hover 仍是指针停住 `restMs: 50` 后打开。`openDelay > 0` 时改走 `delay.open`,不再设 `restMs`,避免两个定时器抢在一起。

## Tooltip

单文件 `ui/Tooltip.tsx`。短 hover 提示,包在 [`Popover`](#popover) 上。图标按钮不要直接用它,[`IconButton`](#iconbutton) 已经内置。

**查阅时机**:给非图标按钮的触发器加一句悬停说明,或改提示的方位 / 延迟 / 空内容行为。

**何时用**:

- 悬停后出现一句说明(或一小块自定义内容)
- 不想自己写定位、翻转、`role="tooltip"`

**何时不用**:

- 图标按钮 → [`IconButton`](#iconbutton) 的 `title`
- 可点击的菜单 / 信息卡 → [`Popover`](#popover)

**API**:

```tsx
<Tooltip
  title="打开工作目录"   // ReactNode,可选。null / undefined / false / '' 时不挂浮层
  placement="top"        // Placement，与 Popover 相同；默认 'top'，放不下时 flip()
  delay={400}            // 打开延迟(ms),默认 400,传给 Popover 的 openDelay
>
  <button type="button">触发器</button>  // 单个 ReactElement
</Tooltip>
```

`placement` 直接用 `@floating-ui/react` 的 `Placement`，不另定义一套方位。

固定行为:`trigger={['hover']}`、`role="tooltip"`、`interactive={false}`。浮层外壳沿用 Popover(背景、边框、阴影、`text-sm`、`text-fg-2`)，圆角用 `rounded-sm`(6px)，比 Popover 的 `rounded-lg` 小一档，因为内容一般只有一行。内容区 `px-3 py-1.5`，`pointer-events-none`。

## Modal

单文件 `ui/Modal.tsx`。视口遮罩上的对话框壳,与 [`Popover`](#popover) 并列,都包 `@floating-ui/react`,不包 `<Popover>`。没有触发器,没有标题和按钮。内容、宽度、内边距由调用方写。

**查阅时机**:加一个居中或距顶的对话框,或把一次性 `fixed inset-0` 收成可复用壳。Setting 整页覆盖不用它。

**何时用**:

- 需要遮罩、Esc、点遮罩关闭、焦点困在框内、进出过渡
- 框内内容完全自定义,只要一层基本外壳

**何时不用**:

- 贴着按钮的菜单 / 信息卡 → [`Popover`](#popover)
- 整页覆盖(Setting) → 自己写 `fixed inset-0`

**API**:

```tsx
<Modal
  open={open}                    // 传了即受控;没传走内部 state
  defaultOpen={false}            // 仅非受控的初始值,默认 false
  onOpenChange={setOpen}         // 受控和非受控都会调用
  closeOnBackdrop={true}         // 点遮罩关闭,默认 true
  closeOnEscape={true}           // Esc 关闭,默认 true
  align="center"                 // 'center' | 'top';默认 'center'
  top={80}                       // 仅 align="top",距视口顶的像素,默认 80
  className="w-full max-w-[360px] p-4"  // 包住 children 的最外层内容盒
  style={{ }}                    // 同一层,CSSProperties,可覆盖内置样式
  aria-labelledby={titleId}
>
  {children}
</Modal>
```

受控时外面不把 `open` 改成 `false`,框就不会关。非受控没有触发器:按 `defaultOpen` 决定一开始是否出现,关掉后保持关闭。

**外壳**(内置):

| 项 | 值 |
|---|---|
| 内容盒背景 | `bg-app`(`#151515`),比 Popover 的 `bg-sidebar` 深 |
| 边框 | `border-border-hover` |
| 圆角 | `rounded-lg` |
| 阴影 | `shadow-lg` |
| 字号 / 字色 | `text-sm` / `text-fg-2` |
| 遮罩 | `bg-black/70`,左右 `px-6` |
| z-index | 遮罩 `z-[100]`,高于 Popover 的 `z-[99]` |
| 过渡 | 出现 200ms `ease-out`,消失 220ms `ease-in`(先停住再收走)。遮罩只淡入淡出;内容盒同时动透明度、`scale` 和 8px 位移。过渡属性要含 `scale` / `translate`(Tailwind v4 不写进 `transform`)。`prefers-reduced-motion` 时无过渡 |

`align="center"` 水平垂直都居中。`align="top"` 只水平居中,`top` 写在遮罩的 `paddingTop` 上。点遮罩用 `mousedown`,避免触摸事件穿透到后面。打开时焦点进入框内第一个可聚焦元素,关闭后回到之前的焦点。背景滚动锁定。`className` / `style` 不作用在遮罩上。

## ResizablePanels

`ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle` 三个一起用,封装自 `react-resizable-panels`。`web.md` §布局 讲了四区布局与尺寸约束;组件 API 在此补完。

**查阅时机**:加可拖布局(新分屏、新抽屉)、改现有 Group 的方向 / 默认尺寸 / 持久化。

**何时用**:

- 拖拽改变面板宽度的场景
- 想用现成的 `usePersistedPanelLayout` 持久化尺寸
- 想统一 1px 分割线 + 5px 命中区 + hover 高亮

**何时不用**:

- 固定宽度 → 用普通 flex / grid
- 嵌套深度 > 2 层 → 评估是否真的需要(用户操作成本)

**API 要点**:

- `<ResizablePanelGroup orientation="horizontal">`(默认 horizontal;也支持 vertical)
- `<ResizablePanel id="…" defaultSize={…} minSize={…} maxSize={…}>`
- `<ResizableHandle />` 自动从 `<Separator>` 套 1px 分割线 + 5px 命中区
- `groupResizeBehavior='preserve-pixel-size'` 让某个面板在父容器变宽时优先保绝对宽度

## 引用关系(避免循环 import)

```
ui/Expandable       ← ui/DisclosureRow
ui/ShinyText        ← ui/DisclosureRow
ui/MarkdownView     ← components/conversation/ThinkingMessage, AssistantMessage
ui/TypewriterText   ← (目前无引用,保留供后续纯文本逐字场景)
ui/Editor           ← components/Composer
ui/MonacoEditor     ← extensions/plugins/files/viewers
ui/MessageSurface   ← components/conversation/UserMessage
ui/PaneHeader       ← extensions/plugins/terminal/TerminalView, extensions/plugins/files/FilesView
ui/Popover          ← ui/Tooltip, components/* (按需)
ui/Modal            ← components/AddProjectDialog
ui/Tooltip          ← ui/IconButton
ui/IconButton       ← components/SidebarActions, components/ProjectSectionHeader, ...
ui/Resizable*       ← pages/Workspace.tsx
```

约束:

- `ui/` 内部子组件可互相引用(如 `DisclosureRow` → `Expandable`),但**只能引同目录或更低层**(底层 = `icons/`、第三方),不可引 `components/` 或 `hooks/` 里带领域状态的模块。
- `ui/` 组件 import `motion/react` / `streamdown` / `@floating-ui/react` / `prosemirror-*` / `monaco-editor` 等第三方 OK,这是「对内封装第三方」的本职。

## 维护约定

- 新增 `ui/` 组件:**先在决策表加一行** + 反例表里写一条「不要重复造」,再写组件;最后在这里加组件小节。
- 修改已有组件 API:同时更新本文件相关小节 + `web.md` §UI 组件库 表格里的指针行,不要留单边。
- 删除组件:从本文件、决策表、反例表、`web.md` 表格里同步移除;grep 一下全仓 `import { X }` 确认零调用。