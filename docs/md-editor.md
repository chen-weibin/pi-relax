# `@relax/md-editor`

查阅时机：改 markdown 编辑器包，或改 `app/mdplayground` 测试页时。包怎么导出、开发时读源码还是读 `dist`，见 [workspace-package.md](workspace-package.md)。这篇只记这个包比那份通用约定多出来的部分。

## 现在有什么

包在 `packages/md-editor`，包名 `@relax/md-editor`。对外从 `src/index.tsx` 导出 `MdEditor`、`DocJson`、`EditorCommand`、`Keybindings`。不导出 `EditorCore` 和 `createEmptyDocJson`。

组件本体在 `src/MdEditor.tsx`。它把 `EditorCore` 挂到内部节点上，卸掉时 `destroy()`。不传 `value` 时非受控，初始文档是内部的 `createEmptyDocJson()`。可选 `value` / `onChange`：只有文档变化才通知；记下刚通知出去的那份对象，父组件把同一引用传回来时不 `setValue`。不支持使用中途从非受控改成受控。`placeholder` 默认 `请输入...`，写成外壳 CSS 变量 `--md-editor-placeholder`。

编辑器内核在 `src/editor/`。`markdown/` 和 `marks/` 还没有。插件在 `src/editor/plugins/`：`keymap.ts`、`placeholder.ts`。

节点规格在 `src/editor/nodes/`，一种节点一个文件：`doc.ts`、`paragraph.ts`、`text.ts`。`nodes/index.ts` 按这个顺序把规格收成一张表，`doc` 排第一。`schema.ts` 只用这张表 `new Schema`。输入规则、快捷键、Markdown 往返、NodeView 不放进节点文件。

`paragraph.ts` 和 `text.ts` 同时导出该节点的 JSON 类型。没有 attrs 的节点不写 `attrs`。`paragraph` 没有子节点时 JSON 里没有 `content`，所以这个字段可选。`text` 的 `text` 必有。

`src/editor/types.ts` 把节点 JSON 收成三层。`InlineJson` 现在只有 `TextJson`。`BlockJson` 现在只有 `ParagraphJson`。`DocJson` 是 `type: 'doc'`，`content` 是一块或多块 `BlockJson`（`[BlockJson, ...BlockJson[]]`），空数组过不了类型检查。`DocJson` 放在这里，是因为它引用 `BlockJson`；`doc.ts` 不再写一份。加一种块或行内节点时，在节点文件里写规格和 JSON 类型，再把它放进 `BlockJson` 或 `InlineJson`。运行时校验仍在 `nodeFromJSON`。`toJSON()` 的返回值是 `any`，`getValue` 和 `createEmptyDocJson` 各有一处断言成 `DocJson`。

现在三种节点：`doc` 的 content 是 `paragraph+`，`paragraph` 的 content 是 `inline*` 并属于 `block`，`text` 属于 `inline`。

`src/editor/json.ts` 的 `createEmptyDocJson()` 用 schema 造一个 doc，里面一个空 paragraph，再 `toJSON()`。空文档的 JSON 是 `{ type: 'doc', content: [{ type: 'paragraph' }] }`。`markdownToDocJson` / `docJsonToMarkdown` 等 4.1 再补进这个文件。

`src/editor/EditorCore.ts` 是类，不从包入口导出。构造收 `mount`、可选 `initialValue`、`onChange`、`keybindings`。缺省文档用 `createEmptyDocJson()`。`getValue()` 返回断言后的 `DocJson`。`setValue(json)` 用共用的 `createEditorState` 建一份新 state 再 `updateState`，选区和新的撤销栈都从头算。`setKeybindings` 用 `state.reconfigure` 只换命令 keymap，同一份 `history()` 留着，撤销栈还在。`focus()` 调用 `view.focus()`。`destroy()` 调用 `view.destroy()`。视图默认可编辑。自定义 `dispatchTransaction` 在 `docChanged` 时调用 `onChange`；`setValue` 不走这条路径。

`createEditorState` 和 `createEditorPlugins` 是构造和 `setValue` 的同一条路。插件顺序：`history()`、命令 keymap、`keymap(baseKeymap)`、占位装饰。`baseKeymap` 负责 Enter、Backspace，这一期不进命令表。命令 id 目前是 `undo` | `redo`。默认键是 `undo` → `Mod-z`，`redo` → `Mod-Shift-z` 和 `Mod-y`。`keybindings` 按命令给键数组：省略的命令用默认键，传入的数组整份替换该命令（空数组表示没有键）。`Mod-` 由 `prosemirror-keymap` 区分 Cmd / Ctrl。

占位插件在文档恰好一个空段落时给该段加 class `mded-empty`。我们自己加的类都以 `mded-` 开头。视图通过 `attributes.class` 再加根类 `mded`，基座的 `ProseMirror` 仍在。文案不进插件，由 `base.css` 的 `.mded p.mded-empty::before` 读 `--md-editor-placeholder`，字色读 `--md-editor-placeholder-color`。

运行时依赖已经声明，版本范围与 `app/web` 里同一批包相同：`prosemirror-model`、`prosemirror-state`、`prosemirror-view`、`prosemirror-commands`、`prosemirror-keymap`、`prosemirror-history`。schema 用 `prosemirror-model`，EditorCore 用 `prosemirror-state`、`prosemirror-view` 和 `prosemirror-history`，keymap 插件用 `prosemirror-commands` 和 `prosemirror-keymap`。这六个包写在 `tsdown.config.mjs` 的 `deps.neverBundle` 里，和 `react`、`react-dom` 一样不打进 `dist`，保持为这个包的直接依赖。`prosemirror-inputrules`、`prosemirror-schema-list`、`prosemirror-tables`、`markdown-it`、`mermaid` 还没加。

`src/editor/state.test.ts` 用 `node --experimental-strip-types --test` 打在 `createEditorState` 上，不挂视图。被这条测试加载的相对 import 带 `.ts` 后缀，`tsconfig.json` 打开了 `allowImportingTsExtensions`。测试文件本身排除在 `tsc` 之外。包脚本是 `pnpm --filter @relax/md-editor test`。

测试页在 `app/mdplayground`，包名 `@relax/mdplayground`。页面只挂这个组件，不另引 CSS。开发命令是根目录的 `pnpm dev:mdplayground`。端口用 Vite 默认值，被占用就顺延。它不进 `pnpm dev`。

## 主题

`MdEditor` 只 `import './styles/base.css'`，不引 `prosemirror-view` 的样式。`base.css` 放两种主题共用的规则：空格、换行、连字、分隔图，以及 `.mded` 和 `.mded.ProseMirror-focused` 的 `outline: none`。会随主题变的值不写在这里。使用方不引 CSS。prop `theme` 目前只有 `'light'`，默认 `'light'`，写到外壳的 `data-theme`。外壳上有一条 Tailwind 工具类 `min-h-4`。

`base.css` 是 Tailwind v4 入口：`@import "tailwindcss" source("..")`，只扫描 `src/`。不建 `tailwind.config.js`。`tailwindcss`（`^4.3.3`）是这个包的依赖。playground 用 `@tailwindcss/vite`（`^4.3.3`）编译组件引入的这份 CSS。同一文件再 `@import "./light.css"`。`light.css` 只在 `[data-theme='light']` 上给变量赋值，现在只有 `--md-editor-placeholder-color`。暗色留到后面：加 `styles/dark.css`，由 `base.css` 引入，并把 `theme` 扩成 `'light' | 'dark'`。

tsdown 不处理 CSS。`deps.neverBundle` 里的 `/\.css$/` 让产物保留 `import "./styles/base.css"`，不把 Tailwind 打进 `dist`。构建把 `src/styles/*.css` 抄到 `dist/styles/`，`base.css` 里的相对 `@import` 才能找到主题文件。开发时 Vite 读源码，不走这份拷贝。

包内 `src/css.d.ts` 声明 `declare module '*.css'`，供本包 `tsc` 识别这个 import。没有对外的 CSS export。

## React

`react` 和 `react-dom` 是 peer（`^19`）。tsdown 不把 peer 打进 `dist`。包的 devDependencies 里另有同一主版本和 `@types/react`，供本包 `tsc` 和生成 `.d.ts`。`tsdown.config.mjs` 的 `deps.neverBundle` 列出 `react`、`react-dom`、上面六个 ProseMirror 包，以及 `/\.css$/`。

构建在共享选项上多了 `platform: 'neutral'` 和 `entry: ['src/index.tsx']`，并保留 `fixedExtension: false`。JSX 用 `react-jsx`。

## 类型检查

消费方 `tsc` 走 `import`，读 `dist`。跑测试页的 `typecheck` 或 `build` 之前，先构建这个包。Vite 开发服务器带 `development` 条件，读 `src/index.tsx`；`optimizeDeps.exclude` 包含 `@relax/md-editor`，改源码会热更新。
