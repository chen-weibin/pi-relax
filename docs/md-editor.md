# `@relax/md-editor`

查阅时机：改 markdown 编辑器包，或改 `app/mdplayground` 测试页时。包怎么导出、开发时读源码还是读 `dist`，见 [workspace-package.md](workspace-package.md)。这篇只记这个包比那份通用约定多出来的部分。

## 现在有什么

包在 `packages/md-editor`，包名 `@relax/md-editor`。当前只导出占位组件 `MdEditor`，渲染文本 `md-editor`。编辑器逻辑还没写。

运行时依赖已经声明，版本范围与 `app/web` 里同一批包相同：`prosemirror-model`、`prosemirror-state`、`prosemirror-view`、`prosemirror-commands`、`prosemirror-keymap`、`prosemirror-history`。源码还没有 import 它们。`prosemirror-inputrules`、`prosemirror-schema-list`、`prosemirror-tables`、`markdown-it`、`mermaid` 还没加。

测试页在 `app/mdplayground`，包名 `@relax/mdplayground`。页面只挂这个组件。开发命令是根目录的 `pnpm dev:mdplayground`。端口用 Vite 默认值，被占用就顺延。它不进 `pnpm dev`。

## React

`react` 和 `react-dom` 是 peer（`^19`）。tsdown 不把 peer 打进 `dist`。包的 devDependencies 里另有同一主版本和 `@types/react`，供本包 `tsc` 和生成 `.d.ts`。`tsdown.config.mjs` 里 `deps.neverBundle` 再列了这两个名字。

构建在共享选项上多了 `platform: 'neutral'` 和 `entry: ['src/index.tsx']`，并保留 `fixedExtension: false`。JSX 用 `react-jsx`。

## 类型检查

消费方 `tsc` 走 `import`，读 `dist`。跑测试页的 `typecheck` 或 `build` 之前，先构建这个包。Vite 开发服务器带 `development` 条件，读 `src/index.tsx`；`optimizeDeps.exclude` 包含 `@relax/md-editor`，改源码会热更新。
