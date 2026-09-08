# app/web 接入说明

## Tailwind CSS

使用 Tailwind v4,通过官方 `@tailwindcss/vite` 插件接入(Vite 6 + React 19)。

### 当前结构

- `vite.config.ts` — `plugins: [react(), tailwindcss()]`
- `src/index.css` — 仅一行 `@import "tailwindcss";`
- `src/main.tsx` — `import './index.css'`

### 扩展

在 `src/index.css` 内追加即可,无需新建 `tailwind.config.js`:

| 需求 | 写法 | 参考 |
|---|---|---|
| 自定义设计 token(颜色/字体/间距) | `@theme { --color-brand-500: ...; }` | https://tailwindcss.com/docs/theme |
| 自定义工具类 | `@utility tab-* { ... }` | https://tailwindcss.com/docs/functions-and-directives |
| 手动 dark mode(class 切换) | `@custom-variant dark (&:where(.dark, .dark *));` | https://tailwindcss.com/docs/dark-mode |
| 容器查询 | `@container`、`@md:grid-cols-3` 等 | https://tailwindcss.com/docs/container-queries |

### 暗色主题

当前未启用任何变体,默认跟随系统 `prefers-color-scheme`。要加手动切换需在 `index.css` 增加 `@custom-variant` 行,并自行维护 `<html class="dark">` 切换逻辑。

### 踩坑备忘

- v4 是 CSS-first,**不要**新建 `tailwind.config.js` 或 `postcss.config.js`。
- 内容扫描自动,无需手写 `content` 字段。
- 不要用字符串拼接构造 class(如 `` `bg-${color}-500` ``),Tailwind 无法识别。
