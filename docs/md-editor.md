# `@relax/md-editor`

查阅时机：改 markdown 编辑器包，或改 `app/mdplayground` 测试页时。包怎么导出、开发时读源码还是读 `dist`，见 [workspace-package.md](workspace-package.md)。这篇只记这个包比那份通用约定多出来的部分。

## 现在有什么

包在 `packages/md-editor`，包名 `@relax/md-editor`。对外从 `src/index.tsx` 只导出占位组件 `MdEditor`。组件本体在 `src/MdEditor.tsx`，渲染文本 `md-editor`。外壳还没接上编辑器。

编辑器内核在 `src/editor/`。`plugins/` 和 `markdown/` 还没有，`marks/` 也还没有。

节点规格在 `src/editor/nodes/`，一种节点一个文件：`doc.ts`、`paragraph.ts`、`text.ts`。`nodes/index.ts` 按这个顺序把规格收成一张表，`doc` 排第一。`schema.ts` 只用这张表 `new Schema`。输入规则、快捷键、Markdown 往返、NodeView 不放进节点文件。

`paragraph.ts` 和 `text.ts` 同时导出该节点的 JSON 类型。没有 attrs 的节点不写 `attrs`。`paragraph` 没有子节点时 JSON 里没有 `content`，所以这个字段可选。`text` 的 `text` 必有。

`src/editor/types.ts` 把节点 JSON 收成三层。`InlineJson` 现在只有 `TextJson`。`BlockJson` 现在只有 `ParagraphJson`。`DocJson` 是 `type: 'doc'`，`content` 是一块或多块 `BlockJson`（`[BlockJson, ...BlockJson[]]`），空数组过不了类型检查。`DocJson` 放在这里，是因为它引用 `BlockJson`；`doc.ts` 不再写一份。加一种块或行内节点时，在节点文件里写规格和 JSON 类型，再把它放进 `BlockJson` 或 `InlineJson`。运行时校验仍在 `nodeFromJSON`。`toJSON()` 的返回值是 `any`，`getValue` 和 `createEmptyDocJson` 各有一处断言成 `DocJson`。

现在三种节点：`doc` 的 content 是 `paragraph+`，`paragraph` 的 content 是 `inline*` 并属于 `block`，`text` 属于 `inline`。

`src/editor/json.ts` 的 `createEmptyDocJson()` 用 schema 造一个 doc，里面一个空 paragraph，再 `toJSON()`。空文档的 JSON 是 `{ type: 'doc', content: [{ type: 'paragraph' }] }`。`markdownToDocJson` / `docJsonToMarkdown` 等 4.1 再补进这个文件。

`src/editor/EditorCore.ts` 是类。构造收 `mount` 和可选 `initialValue`，缺省用 `createEmptyDocJson()`。`getValue()` 返回断言后的 `DocJson`。`setValue(json)` 用 `nodeFromJSON` 建新的 `EditorState` 再 `updateState`，选区会丢。`focus()` 调用 `view.focus()`。`destroy()` 调用 `view.destroy()`。视图默认可编辑。插件列表是空的，没有 `onChange`。这些文件都还没从 `index.tsx` 导出。

运行时依赖已经声明，版本范围与 `app/web` 里同一批包相同：`prosemirror-model`、`prosemirror-state`、`prosemirror-view`、`prosemirror-commands`、`prosemirror-keymap`、`prosemirror-history`。源码已经引用前三个：schema 用 `prosemirror-model`，EditorCore 用 `prosemirror-state` 和 `prosemirror-view`。`prosemirror-commands`、`prosemirror-keymap`、`prosemirror-history` 还没 import。这六个包写在 `tsdown.config.mjs` 的 `deps.neverBundle` 里，和 `react`、`react-dom` 一样不打进 `dist`，保持为这个包的直接依赖。`prosemirror-inputrules`、`prosemirror-schema-list`、`prosemirror-tables`、`markdown-it`、`mermaid` 还没加。

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
