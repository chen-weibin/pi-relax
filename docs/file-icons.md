# 文件类型图标清单

当前文件树用到的彩色图标。已有的已经挂在 [`fileKinds.ts`](../app/web/src/extensions/plugins/files/fileKinds.ts) 上；没挂上的文件显示 `FileUnknownIcon`。

查阅时机：补一张文件图标时。匹配顺序见 [`web.md`](web.md) 的图标节。

补一张图：组件写进 [`fileTypes.tsx`](../app/web/src/icons/fileTypes.tsx)，从 [`icons/index.tsx`](../app/web/src/icons/index.tsx) 再导出，然后在 `fileKinds` 加一条 `names` 或 `extensions`。一行对应一张图，画好后把这一行的状态改成已有。

目录不按名字换图，折叠用 `FolderClosedIcon`，展开用 `FolderOpenIcon`。

## 已有

| 组件 | 命中 | Monaco 高亮 |
|---|---|---|
| `FileMarkdownIcon` | `md` `markdown` | markdown |
| `FileTxtIcon` | `txt` | plaintext |
| `FileJsIcon` | `js` `mjs` `cjs` | javascript |
| `FileTsIcon` | `ts` | typescript |
| `FileTsxIcon` | `tsx`；`jsx` 同一张图 | tsx 用 typescript，jsx 用 javascript |
| `FileCssIcon` | `css` | css |
| `FileHtmlIcon` | `html` `htm` | html |
| `FileJsonIcon` | `json` | json |
| `FilePackageJsonIcon` | 文件名 `package.json` | json |
| `FileUnknownIcon` | 下面表里还没挂上的文件 | plaintext |

## 待提供

这些文件现在都是兜底图标。建议组件名只是占位，画的时候可以改。

| 建议组件 | 挂上后命中 |
|---|---|
| `FileYamlIcon` | `yml` `yaml` |
| `FileTomlIcon` | `toml` |
| `FileXmlIcon` | `xml` |
| `FileSvgIcon` | `svg` |
| `FileImageIcon` | `png` `jpg` `jpeg` `gif` `webp` `ico` `avif` |
| `FileShellIcon` | `sh` `bash` `zsh` |
| `FilePythonIcon` | `py` |
| `FileGoIcon` | `go` |
| `FileRustIcon` | `rs` |
| `FileVueIcon` | `vue` |
| `FileSvelteIcon` | `svelte` |
| `FilePhpIcon` | `php` |
| `FileJavaIcon` | `java` |
| `FileCIcon` | `c` `h` |
| `FileCppIcon` | `cpp` `cc` `hpp` `hh` |
| `FileRubyIcon` | `rb` |
| `FileSqlIcon` | `sql` |
| `FileGraphqlIcon` | `graphql` `gql` |
| `FilePrismaIcon` | `prisma` |
| `FileWasmIcon` | `wasm` |
| `FilePdfIcon` | `pdf` |
| `FileZipIcon` | `zip` `gz` `tgz` |
| `FileFontIcon` | `woff` `woff2` `ttf` `otf` |
| `FileVideoIcon` | `mp4` `webm` `mov` |
| `FileAudioIcon` | `mp3` `wav` `ogg` |
| `FileScssIcon` | `scss` `sass` |
| `FileLessIcon` | `less` |
| `FileGitIcon` | `gitignore` `gitattributes` `gitmodules` `gitkeep`（`.gitignore` 的后缀是 `gitignore`） |
| `FileEnvIcon` | `env`（`.env`）。`.env.local` 的后缀是 `env.local`，要单独再挂一条 |
| `FileDockerIcon` | 文件名 `Dockerfile`、`docker-compose.yml`；扩展名 `dockerignore` |
| `FileEslintIcon` | `eslintrc`、`eslintignore`；文件名 `eslint.config.js`（否则 `.js` 仍是 JS 图标） |

## 已经有相近图标

下面这些现在不是兜底，而是用了更宽的那张图。要单独区分时再画，不画也可以。

| 若要单独的图 | 现在显示 | 单独挂上时的命中 |
|---|---|---|
| readme / info | `FileMarkdownIcon` | 文件名 `readme.md` `readme` |
| changelog | `FileMarkdownIcon` | 文件名 `changelog.md` `changelog` |
| license | `FileMarkdownIcon` 或兜底 | 文件名 `license` `license.md` |
| tsconfig | `FileJsonIcon` | 文件名 `tsconfig.json` |
| vite 配置 | `FileTsIcon` 或 `FileJsIcon` | 文件名 `vite.config.ts` `vite.config.js` |
| 测试文件 | `FileTsIcon` / `FileTsxIcon` / `FileJsIcon` | `spec.ts` `test.ts` `spec.tsx` `test.tsx` `spec.js` `test.js` |
| lock | `yarn.lock` 是兜底；`package-lock.json` 是 JSON 图标 | 文件名 `yarn.lock` `pnpm-lock.yaml` `package-lock.json` |
