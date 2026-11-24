# `@relax/md-editor`

查阅时机：改 markdown 编辑器包，或改 `app/mdplayground` 测试页时。包怎么导出、开发时读源码还是读 `dist`，见 [workspace-package.md](workspace-package.md)。这篇只记这个包比那份通用约定多出来的部分。

## 现在有什么

包在 `packages/md-editor`，包名 `@relax/md-editor`。对外从 `src/index.tsx` 导出 `MdEditor`、`DocJson`、`EditorCommand`、`Keybindings`、`MdEditorMode`、`MdEditorTheme`、`MdEditorThemeTokens`、`MdEditorThemes`。不导出 `EditorCore` 和 `createEmptyDocJson`。

组件本体在 `src/MdEditor.tsx`。它把 `EditorCore` 挂到内部节点上，卸掉时 `destroy()`。不传 `value` 时非受控，初始文档是内部的 `createEmptyDocJson()`。可选 `value` / `onChange`：只有文档变化才通知；记下刚通知出去的那份对象，父组件把同一引用传回来时不 `setValue`。不支持使用中途从非受控改成受控。`placeholder` 默认 `请输入...`，写成外壳 CSS 变量 `--md-editor-placeholder`。`mode` 是 `'edit' | 'read'`，默认 `'edit'`。切换不重建 `EditorCore`。可选 `className` 接到外壳 class 后面，可选 `style` 写在主题变量之后，同名项以传入的为准。

编辑器内核在 `src/editor/`。`markdown/` 和 `marks/` 还没有。插件在 `src/editor/plugins/`：`keymap.ts`、`placeholder.ts`。

节点规格在 `src/editor/nodes/`，一种节点一个文件：`doc.ts`、`paragraph.ts`、`text.ts`。`nodes/index.ts` 按这个顺序把规格收成一张表，`doc` 排第一。`schema.ts` 只用这张表 `new Schema`。输入规则、快捷键、Markdown 往返、NodeView 不放进节点文件。

`paragraph.ts` 和 `text.ts` 同时导出该节点的 JSON 类型。没有 attrs 的节点不写 `attrs`。`paragraph` 没有子节点时 JSON 里没有 `content`，所以这个字段可选。`text` 的 `text` 必有。

`src/editor/types.ts` 把节点 JSON 收成三层。`InlineJson` 现在只有 `TextJson`。`BlockJson` 现在只有 `ParagraphJson`。`DocJson` 是 `type: 'doc'`，`content` 是一块或多块 `BlockJson`（`[BlockJson, ...BlockJson[]]`），空数组过不了类型检查。`DocJson` 放在这里，是因为它引用 `BlockJson`；`doc.ts` 不再写一份。加一种块或行内节点时，在节点文件里写规格和 JSON 类型，再把它放进 `BlockJson` 或 `InlineJson`。运行时校验仍在 `nodeFromJSON`。`toJSON()` 的返回值是 `any`，`getValue` 和 `createEmptyDocJson` 各有一处断言成 `DocJson`。

现在三种节点：`doc` 的 content 是 `paragraph+`，`paragraph` 的 content 是 `inline*` 并属于 `block`，`text` 属于 `inline`。

`src/editor/json.ts` 的 `createEmptyDocJson()` 用 schema 造一个 doc，里面一个空 paragraph，再 `toJSON()`。空文档的 JSON 是 `{ type: 'doc', content: [{ type: 'paragraph' }] }`。`markdownToDocJson` / `docJsonToMarkdown` 等 4.1 再补进这个文件。

`src/editor/EditorCore.ts` 是类，不从包入口导出。构造收 `mount`、可选 `initialValue`、`onChange`、`keybindings`、`mode`。缺省文档用 `createEmptyDocJson()`。`getValue()` 返回断言后的 `DocJson`。`setValue(json)` 用共用的 `createEditorState` 建一份新 state 再 `updateState`，选区和新的撤销栈都从头算。`setKeybindings` 用 `state.reconfigure` 只换命令 keymap，同一份 `history()` 留着，撤销栈还在。`setMode` 也走 `reconfigure`，文档和选区留着。`editable` 在编辑态为 true，阅读态为 false，DOM 上是 `contenteditable`。阅读态打不进字，也不走 `onChange`。`focus()` 调用 `view.focus()`。`destroy()` 调用 `view.destroy()`。自定义 `dispatchTransaction` 在 `docChanged` 时调用 `onChange`；`setValue` 不走这条路径。

`createEditorState` 和 `createEditorPlugins` 是构造和 `setValue` 的同一条路。编辑态插件顺序：`history()`、命令 keymap、`keymap(baseKeymap)`、占位装饰。阅读态只有占位。阅读态卸下 `history` 插件后撤销栈丢掉，切回编辑态同一实例重新 `init`，栈是空的。阅读态调用 `setKeybindings` 只记下绑定，回到编辑态再生效。`baseKeymap` 负责 Enter、Backspace，这一期不进命令表。命令 id 目前是 `undo` | `redo`。默认键是 `undo` → `Mod-z`，`redo` → `Mod-Shift-z` 和 `Mod-y`。`keybindings` 按命令给键数组：省略的命令用默认键，传入的数组整份替换该命令（空数组表示没有键）。`Mod-` 由 `prosemirror-keymap` 区分 Cmd / Ctrl。

占位插件在文档恰好一个空段落时给该段加 class `mded-empty`。我们自己加的类都以 `mded-` 开头。视图通过 `attributes.class` 再加根类 `mded`，基座的 `ProseMirror` 仍在。文案不进插件，由 `base.css` 的 `.mded p.mded-empty::before` 读 `--md-editor-placeholder`，字色读 `--md-editor-placeholder-color`。

运行时依赖已经声明，版本范围与 `app/web` 里同一批包相同：`prosemirror-model`、`prosemirror-state`、`prosemirror-view`、`prosemirror-commands`、`prosemirror-keymap`、`prosemirror-history`。schema 用 `prosemirror-model`，EditorCore 用 `prosemirror-state`、`prosemirror-view` 和 `prosemirror-history`，keymap 插件用 `prosemirror-commands` 和 `prosemirror-keymap`。这六个包写在 `tsdown.config.mjs` 的 `deps.neverBundle` 里，和 `react`、`react-dom` 一样不打进 `dist`，保持为这个包的直接依赖。`prosemirror-inputrules`、`prosemirror-schema-list`、`prosemirror-tables`、`markdown-it`、`mermaid` 还没加。

`src/editor/state.test.ts` 用 `node --experimental-strip-types --test` 打在 `createEditorState` 上，不挂视图。被这条测试加载的相对 import 带 `.ts` 后缀，`tsconfig.json` 打开了 `allowImportingTsExtensions`。测试文件本身排除在 `tsc` 之外。包脚本是 `pnpm --filter @relax/md-editor test`。

测试页在 `app/mdplayground`，包名 `@relax/mdplayground`。页面自己有一份壳层主题，变量前缀是 `--pg-`，数值和编辑器主题相同，暗色正文除外，样式表不互相引用。壳是三块：左侧侧栏、右侧顶栏、顶栏下面的主区域。侧栏放模式按钮，显示当前是编辑还是阅读，收起时按钮跟着藏起来。后面的 playground 控制也放这栏。侧栏底色是 `--pg-surface-2`，顶栏和主区域是 `--pg-bg`。亮色里 `--pg-bg` 和 `--pg-surface` 都是白色，侧栏不用 `--pg-surface`。侧栏和右侧之间没有分割线。`shell.css` 用 `@import "tailwindcss"`，再用 `@theme inline` 把 `--pg-*` 映成 `app`、`sidebar`、`surface`、`fg`、`border`。`--pg-*` 只写在 `[data-theme]` 上，所以同一组映射在这个选择器上再写一遍，工具类才能跟着主题变。`surface-active` 没有现成变量，用 `color-mix` 把 `--pg-surface-2` 混一点 `--pg-text`。`fg-bright` 没有更亮的一档，映到 `--pg-text`。顶栏的收起和主题用 `src/ui/Button.tsx`，默认 `tone="brand"`、`solid`。变体分档与 `app/web/src/ui/Button.tsx` 相同，色调多一档 `brand`，class 用 `classnames` 拼接。尺寸跟壳层主题，和 `app/web` 的按钮同一档：sm / md / lg 高 24 / 30 / 36px，圆角 `--pg-radius-sm` / `md` / `lg`（6 / 8 / 10px），字号 `--pg-font-sm` / `base` / `lg`（12 / 14 / 16px）。页面上的模式、收起、主题用 `sm`（24px / 12px）。顶栏高 40px。`brand` 实底在亮色是 `--pg-brand` 配 `--pg-inverse-text`（白字压 `#6478E8`），悬停 `--pg-brand-600`，按下 `--pg-brand-700`。暗色的 `--pg-brand` 是 `#8492FF`，铺满会在深底上发亮，所以实底改成 `--pg-brand-soft`，字用 `--pg-brand`。悬停把 soft 混进一点 brand。字重 400。`neutral` 的 `solid` 仍用 `--pg-surface-2`，因为亮色里 `--pg-surface` 和页面底同为白色。没有单独的按钮样式表，也没有 `loading`。顶栏切换主题时，壳的 `data-theme` 和 `MdEditor` 的 `theme` 一起变。左侧侧栏用 `motion` 改宽度，时长读 `--pg-duration`，叠放用 `--pg-z-fixed`。展开收起记在 `localStorage` 的 `mdplayground.sidebar-open`：`0` 是收起，`1` 是展开，没有这项或读失败时缺省展开。主区域里正文栏由页面决定：宽 `min(760px, calc(100% - 64px))`，水平居中；窄于 700px 时改成 `min(720px, calc(100% - 32px))`。`MdEditor` 铺满这一栏，自己不收 `maxWidth`。开发命令是根目录的 `pnpm dev:mdplayground`。端口用 Vite 默认值，被占用就顺延。它不进 `pnpm dev`。

## 主题

`MdEditor` 只 `import './styles/base.css'`，不引 `prosemirror-view` 的样式。`base.css` 放两种主题共用的规则：空格、换行、连字、分隔图，以及 `.mded` 和 `.mded.ProseMirror-focused` 的 `outline: none`。会随主题变的值不写在这里。使用方不引 CSS。prop `theme` 是 `'light' | 'dark'`，默认 `'light'`，写到外壳的 `data-theme`。外壳是 `flex min-h-full flex-col`，挂载节点 `flex-1`，让 `.mded` 在父级有高度时铺满。没有第三套主题，也不能注册新主题名。

可选 `themes` 按当前 `theme` 局部覆盖。只把传入的键写成外壳 inline 变量，没传的键仍用样式表里的默认。默认值只在 CSS 里。切换主题不重建 `EditorCore`。占位文案仍是 `--md-editor-placeholder`，不在 token 表里。token 键到变量名的映射在 `src/theme.ts` 的 `themeTokenVars`。`src/theme.test.ts` 断言传入的键会写上、没传的键不出现。

`base.css` 是 Tailwind v4 入口：`@import "tailwindcss" source("..")`，只扫描 `src/`。不建 `tailwind.config.js`。`tailwindcss`（`^4.3.3`）是这个包的依赖。playground 用 `@tailwindcss/vite`（`^4.3.3`）编译组件引入的这份 CSS。同一文件再 `@import "./light.css"` 和 `@import "./dark.css"`。两份都在对应的 `[data-theme]` 上赋值，变量前缀 `--md-editor-`。

token 分组：语义色（含页面底 `--md-editor-bg`、表面、边框、三级文字、品牌、信息、成功、警告、错误和各自的 soft、inverse）、中性色阶、品牌色阶 50–950、圆角、间距、字号阶梯、四档阴影、八档层级、三档时长。圆角、间距、字号、层级、时长和正文字体两边默认相同，仍各写一份。阴影、语义色和品牌色阶 500 及以后两边不同。亮色品牌 500 是 `#6478E8`，暗色是 `#8492FF`。色值来自 `tmp/design-system-preview.html`。这一期不从色阶再推背景、边框、填充。字号阶梯对齐 `app/web` 的同名档：xs 11 / sm 12 / base 14 / lg 16 / xl 20 / 2xl 24，3xl / 4xl 是 24 / 28。圆角 xs / lg / xl 是 4 / 10 / 12px，sm / md 仍是 6 / 8px。

编辑器正文专用、可单边覆盖：`--md-editor-font-family`、`--md-editor-font-size`（`16px`）、`--md-editor-line-height`（`1.6`）、`--md-editor-paragraph-gap`（`12px`）。正文字号 16px，行高 1.6，段距 12px。字体栈仍是系统无衬线。占位色用三级文字，光标用品牌色，选区是品牌色 0.28 透明度，分隔线用默认边框色。暗色正文 `--md-editor-text` 是 `#d8d8d8`，不跟壳层的 `#f1f1f1`，黑底上不发白。亮色仍是 `#171717`。

`.mded` 使用文字、背景、光标、字号、行高、字体，`::selection` 使用选区色，段落使用下边距，空段占位使用占位色，`.mded hr` 使用 1px 分隔色。其余变量先定义，后面的块、菜单、浮层再引用。编辑器还没有浮层，层级和时长只放在主题上。

正文内边距写在 `.mded` 上，不进 `themes`。`--md-editor-pad-top` 用 `--md-editor-space-8`（8px），`--md-editor-pad-x` 用 `--md-editor-space-24`（24px），`--md-editor-pad-bottom` 是 24px 的 2 倍（48px）。`box-sizing: border-box`，`min-height: 100%`。栏宽仍由使用方决定，这两层不叠：页边在栏外，这圈在栏内。

`.mded` 行高 `1.6`，`.mded p` 的 margin 是 `0 0 12px`（`--md-editor-paragraph-gap`）。段与段之间只有这一截下边距，上边距是 0。

tsdown 不处理 CSS。`deps.neverBundle` 里的 `/\.css$/` 让产物保留 `import "./styles/base.css"`，不把 Tailwind 打进 `dist`。构建把 `src/styles/*.css` 抄到 `dist/styles/`，`base.css` 里的相对 `@import` 才能找到主题文件。开发时 Vite 读源码，不走这份拷贝。

包内 `src/css.d.ts` 声明 `declare module '*.css'`，供本包 `tsc` 识别这个 import。没有对外的 CSS export。

## React

`react` 和 `react-dom` 是 peer（`^19`）。tsdown 不把 peer 打进 `dist`。包的 devDependencies 里另有同一主版本和 `@types/react`，供本包 `tsc` 和生成 `.d.ts`。`tsdown.config.mjs` 的 `deps.neverBundle` 列出 `react`、`react-dom`、上面六个 ProseMirror 包，以及 `/\.css$/`。

构建在共享选项上多了 `platform: 'neutral'` 和 `entry: ['src/index.tsx']`，并保留 `fixedExtension: false`。JSX 用 `react-jsx`。

## 类型检查

消费方 `tsc` 走 `import`，读 `dist`。跑测试页的 `typecheck` 或 `build` 之前，先构建这个包。Vite 开发服务器带 `development` 条件，读 `src/index.tsx`；`optimizeDeps.exclude` 包含 `@relax/md-editor`，改源码会热更新。
