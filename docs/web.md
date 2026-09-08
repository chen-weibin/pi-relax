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
  --app: #141414;
  --surface: #1e1e1e;
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
| `--app` | `bg-app` | `#141414` | 主背景 |
| `--sidebar` | `bg-sidebar` | `#171717` | 侧边栏 |
| `--surface` | `bg-surface` | `#1E1E1E` | 浮起表面 |
| `--surface-hover` | `bg-surface-hover` | `#242424` | hover |
| `--surface-active` | `bg-surface-active` | `#292929` | active |
| `--fg` | `text-fg` | `#E5E5E5` | 主文字 |
| `--fg-2` | `text-fg-2` | `#A1A1A1` | 次文字 |
| `--fg-3` | `text-fg-3` | `#737373` | 三级文字 |
| `--fg-disabled` | `text-fg-disabled` | `#555555` | 禁用 |
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

## 布局

Cursor 风格四区平级布局,无外层包裹元素,全部由 `App.tsx` 直接组合。

### 目录

```
src/
├── App.tsx                       # 持有 settingOpen, 横向 flex 排布三区
└── components/
    ├── Sidebar.tsx               # 左 260px, 底部 setting 入口
    ├── Conversation.tsx          # 中 flex-1
    ├── Extension.tsx             # 右 570px
    └── Setting.tsx               # 全屏 fixed inset-0 z-50 覆盖层
```

### 区段尺寸

| 区 | 宽度 | 位置 |
|---|---|---|
| Sidebar | `w-[260px]` | 左 |
| Conversation | `flex-1` | 中,自适应 |
| Extension | `w-[570px]` | 右 |
| Setting | `fixed inset-0` | 开启时覆盖全部 |

`App.tsx` 用 `useState(settingOpen)` 控制 Setting 显隐:`{settingOpen && <Setting onClose={...} />}`。Setting `z-50`,在四区上方全屏渲染。

### 命名约定

- 组件文件名与组件名一致且单数:`Sidebar` / `Conversation` / `Extension` / `Setting`。
- `className?: string` 用于让父组件控制尺寸/边框(`Conversation`、`Extension`);全幅组件不接 prop(`Sidebar`、`Setting`)。
- props 命名沿用领域词,不缩写:`onOpenSetting` / `onClose`。