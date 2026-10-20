# 文件类型图标清单

当前文件树用到的彩色图标。已有的已经挂在 [`fileKinds.ts`](../app/web/src/extensions/plugins/files/fileKinds.ts) 上；没挂上的文件显示 `FileUnknownIcon`。

查阅时机：补一张文件图标时。匹配顺序见 [`web.md`](web.md) 的图标节。

补一张图：组件写进 [`fileTypes.tsx`](../app/web/src/icons/fileTypes.tsx)，从 [`icons/index.tsx`](../app/web/src/icons/index.tsx) 再导出，然后在 `fileKinds` 加一条 `names` 或 `extensions`。一行对应一张图，画好后把这一行的状态改成已有。

目录不按名字换图，折叠用 `FolderClosedIcon`，展开用 `FolderOpenIcon`。

`.env` 和 `.env.*` 不走扩展名表。`resolveFileKind` 看文件名是 `.env` 或以 `.env.` 开头。

## 已有

| 组件 | 命中 | Monaco 高亮 | 颜色 |
|---|---|---|---|
| `FileMarkdownIcon` | `md` `markdown` | markdown | `#61A0FF` |
| `FileReadmeIcon` | 文件名 `readme.md` `readme` | markdown | `#7E77FF`，viewBox 再留一圈，实心方块比旁边字母图标小一档 |
| `FileChangelogIcon` | 文件名 `changelog.md` `changelog` | markdown | `#8BC34A` |
| `FileLicenseIcon` | 文件名 `license` `license.md` | markdown | `#F5A333` |
| `FileAgentsIcon` | 文件名 `agents.md` | markdown | `#7C6AF7` |
| `FileTxtIcon` | `txt` | plaintext | `#A4A4A5` |
| `FileJsIcon` | `js` `mjs` `cjs` | javascript | `#F4DE51` |
| `FileJsTestIcon` | `spec.js` `test.js` | javascript | `#2EA043` |
| `FileTsIcon` | `ts` | typescript | `#3178C6` |
| `FileTsTestIcon` | `spec.ts` `test.ts` | typescript | `#2EA043` |
| `FileTsxIcon` | `tsx`；`jsx` 同一张图 | tsx 用 typescript，jsx 用 javascript | `#6563FF` |
| `FileTsxTestIcon` | `spec.tsx` `test.tsx`；`spec.jsx` `test.jsx` 同一张图 | tsx 用 typescript，jsx 用 javascript | `#2EA043` |
| `FileViteIcon` | 文件名 `vite.config.ts` `vite.config.mts` `vite.config.js` `vite.config.mjs` `vite.config.cjs` | ts/mts 用 typescript，其余用 javascript | `#863BFF` |
| `FileCssIcon` | `css` | css | `#264DE4` |
| `FileScssIcon` | `scss` `sass` | scss | `#FF83C4` |
| `FileLessIcon` | `less` | less | `#7BA4E0` |
| `FileHtmlIcon` | `html` `htm` | html | `#E34F26` |
| `FileXmlIcon` | `xml` | xml | `#43A047` |
| `FileVueIcon` | `vue` | html | `#41B883` |
| `FileSvelteIcon` | `svelte` | html | `#FF5722` |
| `FileJsonIcon` | `json` | json | `#CBCB41` |
| `FilePackageJsonIcon` | 文件名 `package.json` | json | `#CB3837` |
| `FileLockIcon` | 文件名 `yarn.lock` `pnpm-lock.yaml` `package-lock.json` | plaintext | `#2C8EBB` |
| `FileYamlIcon` | `yml` `yaml` | yaml | `#CB171E` |
| `FileTomlIcon` | `toml` | ini | `#C9895A`，viewBox 比默认多留一圈 |
| `FileSvgIcon` | `svg` | plaintext | `#FFB300` |
| `FileImageIcon` | `png` `jpg` `jpeg` `gif` `webp` `ico` `avif` | plaintext | 原色 |
| `FileShellIcon` | `sh` `bash` `zsh` | shell | `#A8A8A8` |
| `FilePythonIcon` | `py` | python | 原色 |
| `FileGoIcon` | `go` | go | 原色 |
| `FileRustIcon` | `rs` | rust | `#FF7043` |
| `FilePhpIcon` | `php` | php | `#1E88E5` |
| `FileJavaIcon` | `java` | java | 原色 |
| `FileHIcon` | `h` | c | `#666767` |
| `FileCIcon` | `c` | c | 原色 |
| `FileCppIcon` | `cpp` `cc` `hpp` `hh` | cpp | 原色 |
| `FileRubyIcon` | `rb` | ruby | `#CC342D` |
| `FileSqlIcon` | `sql` | sql | `#1677FF` |
| `FileGraphqlIcon` | `graphql` `gql` | graphql | `#EC407A` |
| `FilePrismaIcon` | `prisma` | plaintext | `#00BFA5` |
| `FileWasmIcon` | `wasm` | plaintext | `#654FF0` |
| `FilePdfIcon` | `pdf` | plaintext | `#FA4E4E` |
| `FileZipIcon` | `zip` `gz` `tgz` | plaintext | `#7DB4FF` |
| `FileFontIcon` | `woff` `woff2` `ttf` `otf` | plaintext | `#E67E22` |
| `FileVideoIcon` | `mp4` `webm` `mov` | plaintext | `#8183F1` |
| `FileAudioIcon` | `mp3` `wav` `ogg` | plaintext | `#8281F9` |
| `FileGitIcon` | `gitignore` `gitattributes` `gitmodules` `gitkeep` | plaintext | `#D52A29` |
| `FileEnvIcon` | 文件名 `.env` 或以 `.env.` 开头 | ini | `#A8A8A8` |
| `FileTsconfigIcon` | 文件名 `tsconfig.json`。与 env 同一齿轮，颜色换成 TypeScript 蓝 | json | `#3178C6` |
| `FileEslintIcon` | 文件名 `eslint.config.js` `eslint.config.mjs` `eslint.config.cjs` `eslint.config.ts` `eslint.config.mts`；扩展名 `eslintrc` `eslintrc.js` `eslintrc.cjs` `eslintrc.mjs` `eslintrc.json` `eslintrc.yml` `eslintrc.yaml` `eslintignore` | js/cjs/mjs 用 javascript，ts/mts 用 typescript，json 与无后缀 `eslintrc` 用 json，yml/yaml 用 yaml，`eslintignore` 用 plaintext | `#7963E6` |
| `FileDockerIcon` | 文件名 `Dockerfile`、`docker-compose.yml`、`docker-compose.yaml`；扩展名 `dockerignore` | Dockerfile 用 dockerfile，compose 用 yaml，dockerignore 用 plaintext | `#2496ED` |
| `FileUnknownIcon` | 还没挂上的文件 | plaintext | `#CCCCCC` |
