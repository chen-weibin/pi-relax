# UI 组件库

`app/web/src/ui/` 是 `app/web` 的 UI 组件库目录,业务无关、可在多处复用。对内封装第三方库,对上提供与领域词无关的原子组件。

> 集成层(Tailwind 接入、设计 token、`app/web` 四区布局、滚动条变体)在 [`docs/web.md`](web.md)。本文档回答「该用哪个 / 别自己写 / 组件细节」。

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
| 图标按钮(可访问、统一样式) | [`IconButton`](#iconbutton) | 不要写裸 `<button>` 套 `<svg>`(style 漂移、`disabled` 漏处理) |
| 浮层 / Tooltip / 菜单 | [`Popover`](#popover) | 不要直接用 `@floating-ui/react`(定位/翻转/portal 都要自己粘) |
| 富文本输入(Enter 提交 / 多行展开) | [`Editor`](#editor) + 领域组件 `Composer` | 不要拿 `<textarea>`(无 IME 友好 / 无 history / 无 keymap) |
| 渲染 Markdown(流式 / 静态) | [`MarkdownView`](#markdownview) | 不要直接 `<Streamdown>`(无项目样式封装) |
| 逐字打字机(纯文本) | [`TypewriterText`](#typewritertext) | 不要自己写 `setInterval` / `requestAnimationFrame` 循环切字符串 |
| 渐变扫光文字(标题 / CTA / loading) | [`ShinyText`](#shinytext) | 不要自己写 `linear-gradient` + `@keyframes`,也不要为单次使用装 `motion` |
| 标题 + 展开收起(chevron + 高度过渡 + 标题可扫光) | [`DisclosureRow`](#disclosurerow) | 不要写本地 `<button>` + `<svg>` + `useState` 三件套 |
| 任意区域的高度过渡展开(无 header) | [`Expandable`](#expandable) | 不要自己写 `max-height` 凑数(无法适配动态内容高度);不要为单处使用装 `framer-motion` |
| 轻量卡片外壳(无角色语义) | [`MessageSurface`](#messagesurface) | 不要在块组件里手写 `bg-surface rounded-md border-border` 之类的样式散落 |
| 点阵 loading(3×3 / 4×4,多尺寸多形状) | [`DotMatrix`](#dotmatrix) | 不要为单个 loading 写一次性 `<div>` 网格 + 自写 CSS `@keyframes`(`motion/react` 已在依赖里) |
| 单点状态指示(成功 / 失败 / 已读) | [`StatusDot`](#statusdot) | 不要为 `success` / `failure` 单独写 `<div>` + 内联颜色;统一走 `StatusDot` + 项目语义色 token |

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
| 背景 | `#202020`(比 `--surface` 略深) |
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

**API**: `variant: ghost | solid`,`size: sm | md`,`disabled` 自动降透明 + 禁交互,`type` 默认 `button`,透传其他原生属性(`aria-pressed` / `name` / `value` / `tabIndex` 等)。

## Popover

封装自 `@floating-ui/react`(`useFloating` + `useClick` / `useHover` + `useDismiss` + `useRole`),负责"算坐标 + 处理交互"这类底层逻辑,样式由 Popover 自行接管。

**查阅时机**:加 tooltip / dropdown / context menu / 信息卡浮层,或评估直接用 `@floating-ui/react`。

**何时用**:

- 需要点击或 hover 触发的浮层
- 需要自动定位、翻转、滚动跟随
- 想统一浮层视觉(背景、边框、圆角、阴影、字号、z-index)

**何时不用**:

- 全屏 modal → 自己写 fixed inset-0 覆盖层(参考 [`web.md` §Setting](web.md#布局))
- 不需要浮层定位 → inline 展开

**API**:

```tsx
<Popover
  trigger={['click']}            // 触发模式,默认 ['click'];支持 ['click'] / ['hover'] / ['click','hover']
  placement="bottom-start"        // 12 种 Placement:top/bottom/left/right × start/center/end;默认 'bottom-start'
  offset={6}                      // 主轴偏移(距 trigger),默认 6
  crossOffset={0}                 // 十字轴偏移(对齐微调),默认 0
  interactive={false}             // hover 模式下,浮层里是否有可交互内容(按钮/链接等);默认 false
  open / onOpenChange             // 受控用法;二者都给才走受控,否则内部 state
  className                       // 透传到浮层容器
  content={<div>浮层内容</div>}   // 浮层内容(必填)
>
  <button>触发器</button>          // children,单个 ReactElement(必填)
</Popover>
```

**浮层样式**(内置,无需额外配置):

| 项 | 值 | 来源 |
|---|---|---|
| 背景 | `bg-sidebar` (`#1E1E1E`) | 与 Sidebar 同色,"沉下去" |
| 边框 | `border-border-hover` (`#383838`) | 比背景亮一档,对比明显 |
| 圆角 | `rounded-lg` (10px) | §34 |
| 阴影 | `shadow-lg` | 微凸 |
| 字号 | `text-sm` (12px) | §3.1 |
| 文字色 | `text-fg-2` | 次级文字 |
| z-index | `z-[99]` | 全局最高一档(预留 Setting 等覆盖层用更高值) |

> 内 padding 不固定 —— 由 `content` 自己控制(popover 内容差异巨大,tooltip 用 `px-3 py-1.5`,菜单用 `p-1`,信息卡用 `p-3`)。

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
ui/MessageSurface   ← components/conversation/UserMessage
ui/IconButton       ← components/SidebarActions, components/ProjectSectionHeader, ...
ui/Popover          ← components/* (按需)
ui/Resizable*       ← App.tsx
```

约束:

- `ui/` 内部子组件可互相引用(如 `DisclosureRow` → `Expandable`),但**只能引同目录或更低层**(底层 = `icons/`、第三方),不可引 `components/` 或 `hooks/` 里带领域状态的模块。
- `ui/` 组件 import `motion/react` / `streamdown` / `@floating-ui/react` / `prosemirror-*` 等第三方 OK,这是「对内封装第三方」的本职。

## 维护约定

- 新增 `ui/` 组件:**先在决策表加一行** + 反例表里写一条「不要重复造」,再写组件;最后在这里加组件小节。
- 修改已有组件 API:同时更新本文件相关小节 + `web.md` §UI 组件库 表格里的指针行,不要留单边。
- 删除组件:从本文件、决策表、反例表、`web.md` 表格里同步移除;grep 一下全仓 `import { X }` 确认零调用。