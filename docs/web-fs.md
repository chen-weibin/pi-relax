# 前端文件系统

当前实现。右侧文件插件怎么列目录、哪些文件会读进 Monaco、打不开时怎么显示。服务端读文件和 `fs.maxBytes` 见 [server-fs.md](server-fs.md)（查阅时机：核对整文件 413、分段固定 `binary`、列表里的 `size` 时）。壳层 tab 和树的布局见 [web-extension.md](web-extension.md)（查阅时机：改 tab、欢迎页、目录树交互时）。

代码：类型表在 `app/web/src/extensions/plugins/files/fileKinds.ts`，打开判断在 `openPolicy.ts`，字节展示在 `app/web/src/formatByteSize.ts`。

## 功能点

1. **目录树。** 根是当前对话的工作目录。展开一层才 `GET /api/fs/list`。返回的文件和目录都列出来，不按扩展名或大小过滤。每一项带上 `size`（自己的字节数）。顺序与服务端 `readdir` 一致。
2. **打开文件。** 同一路径只占一个壳层 tab。没选文件时主区居中「请选择要打开的文件」。
3. **先认类型，再看大小，再读。** 只有登记为文本的文件，并且字节数小于或等于 16 MiB，才整文件 `GET /api/fs/read`。其它情况不发读请求。
4. **展示。** 读入的文本进 Monaco，可改。停手 400ms 后整文件以 `text` 写回。打不开时用文件类型图标加居中一行字。
5. **磁盘变化。** 已打开且没有未保存草稿时，先刷新父目录列表，用新的 `size` 再决定读不读。有草稿则提示「磁盘已变化」。

`stat` 只在目录列表里还没有这个文件时用来补大小（例如刷新后 tab 还在、父目录还没展开）。树上已经有的项不再为了看大小多请求一次。

## 怎么判断能不能打开

和文件图标同一套匹配，不另写规则。实现是 `resolveFileKind`，顺序在 `matchFileIcon`：

1. 带父目录的文件名
2. 文件名
3. 从长到短的扩展名（`foo.test.ts` 先看 `test.ts`，再看 `ts`）
4. 对不上则是未知类型

另外：文件名是 `.env`，或以 `.env.` 开头，算 env，不走扩展名表。`notes.env` 不算。

`FileKind.open` 只有两种：`text` 才读、才进 Monaco；`none` 不读。未登记的路径得到未知类型，`open` 是 `none`。以后要多支持一种，在 `fileKinds.ts` 加一条 `names` 或 `extensions`，并写上 `open`。不写 `open` 时登记项默认是 `text`。

大小上限是前端常量 `FS_MAX_BYTES`，**16777216（16 MiB）**，与后端 `fs.maxBytes` 的默认值相同，不读 `config.json`。后端改了配置，这里不会跟着变。等于上限仍读取。大于上限不读。

字节数优先用列表里的 `size`。没有再 `stat`。

## 当前支持打开（`open: 'text'`）

这些进 Monaco，语言见类型表，对不上高亮时是 `plaintext`。

| 种类 | 认法 |
| --- | --- |
| Markdown | `.md` `.markdown`；文件名 `readme`、`changelog`、`license`、`agents.md` 以及带 `.md` 的同名文件 |
| 纯文本 | `.txt` |
| JavaScript | `.js` `.mjs` `.cjs` `.jsx`，以及 `test` / `spec` 后缀；`vite.config.js` 等 |
| TypeScript | `.ts` `.tsx`，以及 `test` / `spec` 后缀；`vite.config.ts` 等 |
| 样式 | `.css` `.scss` `.sass` `.less` |
| 标记 | `.html` `.htm` `.xml` `.vue` `.svelte` |
| 数据 | `.json` `.yml` `.yaml` `.toml`；`package.json`、`tsconfig.json`、eslint 配置 |
| 锁文件 | 文件名 `yarn.lock`、`pnpm-lock.yaml`、`package-lock.json` |
| SVG | `.svg`。按 XML 源码编辑，不画成图片 |
| 脚本和源码 | `.sh` `.bash` `.zsh` `.py` `.go` `.rs` `.php` `.java` `.c` `.h` `.cpp` `.cc` `.hpp` `.hh` `.rb` `.sql` `.graphql` `.gql` `.prisma` |
| Git | `.gitignore` `.gitattributes` `.gitmodules` `.gitkeep` |
| Docker | 文件名 `Dockerfile`、`docker-compose.yml` / `yaml`；`.dockerignore` |
| 环境变量 | 文件名 `.env`、`.env.*` |

无后缀但上表已按文件名登记的（`Dockerfile`、`README`、`CHANGELOG`、`LICENSE`）可以打开。没登记的无后缀文件不能打开，例如 `Makefile`。

## 当前不支持打开（`open: 'none'`）

不发读请求。主区是该类型图标，居中「当前不支持该文件类型」。

| 种类 | 后缀 |
| --- | --- |
| 图片 | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.ico` `.avif` |
| PDF | `.pdf` |
| 压缩包 | `.zip` `.gz` `.tgz` |
| 字体 | `.woff` `.woff2` `.ttf` `.otf` |
| 视频 | `.mp4` `.webm` `.mov` |
| 音频 | `.mp3` `.wav` `.ogg` |
| Wasm | `.wasm` |
| 未知 | 上表没有的后缀和文件名，包括 `.doc` `.docx` 以及 `Makefile` |

树上仍然列出这些文件，点开仍占一个 tab。

## 读之前的大小

文本文件用列表或 `stat` 拿到的字节数和 `FS_MAX_BYTES` 比。大于上限不请求正文。文案带按字节换算的大小，换算在 `formatByteSize`：1024 进制，单位 `B` / `KB` / `MB` / `GB` / `TB`，整数不带小数。18 MiB 显示为 `18 MB`。

文案：`文件过大（18 MB），当前不支持展示`。

## 读到的正文

通过大小判断之后才整文件读取，不带分段参数。响应头 `X-Relax-Transfer` 为 `binary` 时不进 Monaco，图标居中「当前文件不是文本，无法展示」。否则 `TextDecoder` 解成字符串交给编辑器。

服务端没收到传输声明时，只按开头最多 8 KiB 标 `text` / `binary`。开头是文本、后面才有二进制时，头仍可能是 `text`，这段仍会进编辑器。

## 缺省展示

打不开、读失败、正在读，都用 `EmptyState`：居中、该文件的类型图标、一行字。

| 状态 | 显示 |
| --- | --- |
| 还没选文件 | 「请选择要打开的文件」 |
| 正在读 | 「加载中…」 |
| 类型未登记或 `open` 为 `none` | 「当前不支持该文件类型」 |
| 文本但大于 16 MiB | 「文件过大（…），当前不支持展示」 |
| 读完头是 `binary` | 「当前文件不是文本，无法展示」 |
| 路径不存在 | 「文件已删除」 |
| 没权限或其它读失败 | 错误原因 |
| 空的文本文件 | 空的 Monaco |
| 文本 | Monaco，可编辑 |

Monaco 字号 13，行高 22，小地图开着，不自动折行。
