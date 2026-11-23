# `@relax/md-editor`

查阅时机：改 markdown 编辑器包，或改 `app/mdplayground` 测试页时。包怎么导出、开发时读源码还是读 `dist`，见 [workspace-package.md](workspace-package.md)。这篇只记这个包比那份通用约定多出来的部分。

## 现在有什么

包在 `packages/md-editor`，包名 `@relax/md-editor`。对外从 `src/index.tsx` 只导出占位组件 `MdEditor`。组件本体在 `src/MdEditor.tsx`，渲染文本 `md-editor`。编辑器逻辑还没写。schema 和 EditorCore 留到最小可运行那一期再加文件。

运行时依赖已经声明，版本范围与 `app/web` 里同一批包相同：`prosemirror-model`、`prosemirror-state`、`prosemirror-view`、`prosemirror-commands`、`prosemirror-keymap`、`prosemirror-history`。源码还没有 import 它们。这六个包写在 `tsdown.config.mjs` 的 `deps.neverBundle` 里，和 `react`、`react-dom` 一样不打进 `dist`，保持为这个包的直接依赖。`prosemirror-inputrules`、`prosemirror-schema-list`、`prosemirror-tables`、`markdown-it`、`mermaid` 还没加。

测试页在 `app/mdplayground`，包名 `@relax/mdplayground`。页面只挂这个组件，不另引 CSS。开发命令是根目录的 `pnpm dev:mdplayground`。端口用 Vite 默认值，被占用就顺延。它不进 `pnpm dev`。

## 主题

`MdEditor` 自己 `import './styles/light.css'`。使用方不引 CSS。prop `theme` 目前只有 `'light'`，默认 `'light'`，写到外壳的 `data-theme`。这一期不画亮色和暗色的颜色。外壳上有一条 Tailwind 工具类 `min-h-4`。

`styles/light.css` 是 Tailwind v4 入口：`@import "tailwindcss" source("..")`，只扫描 `src/`。不建 `tailwind.config.js`。`tailwindcss`（`^4.3.3`）是这个包的依赖。playground 用 `@tailwindcss/vite`（`^4.3.3`）编译组件引入的这份 CSS。暗色留到后面：再加 `styles/dark.css`，仍由组件引入，并把 `theme` 扩成 `'light' | 'dark'`。

tsdown 不处理 CSS。`deps.neverBundle` 里的 `/\.css$/` 让产物保留 `import "./styles/light.css"`，不把 Tailwind 打进 `dist`。构建接着把 `src/styles/light.css` 抄到 `dist/styles/light.css`，这份相对路径才能找到文件。开发时 Vite 读源码，不走这份拷贝。

包内 `src/css.d.ts` 声明 `declare module '*.css'`，供本包 `tsc` 识别这个 import。没有对外的 CSS export。

## React

`react` 和 `react-dom` 是 peer（`^19`）。tsdown 不把 peer 打进 `dist`。包的 devDependencies 里另有同一主版本和 `@types/react`，供本包 `tsc` 和生成 `.d.ts`。`tsdown.config.mjs` 的 `deps.neverBundle` 列出 `react`、`react-dom`、上面六个 ProseMirror 包，以及 `/\.css$/`。

构建在共享选项上多了 `platform: 'neutral'` 和 `entry: ['src/index.tsx']`，并保留 `fixedExtension: false`。JSX 用 `react-jsx`。

## 类型检查

消费方 `tsc` 走 `import`，读 `dist`。跑测试页的 `typecheck` 或 `build` 之前，先构建这个包。Vite 开发服务器带 `development` 条件，读 `src/index.tsx`；`optimizeDeps.exclude` 包含 `@relax/md-editor`，改源码会热更新。
