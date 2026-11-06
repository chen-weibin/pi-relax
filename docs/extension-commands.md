# 命令总线

查阅时机：注册一条命令、从页面或其它模块调用命令、或给仓库外的插件接这张表时。

壳层 tab、欢迎页和 `openPlugin` 仍看 [web-extension.md](web-extension.md)。那条路径是零参数开一个默认 tab。命令是旁边的调用通道，不代替它。

## 一张表

实现在 [`app/web/src/extensions/commands.ts`](../app/web/src/extensions/commands.ts)。全站只有这一份，不另做前端总线，也不包 React hook。

插件系统外只和这张表通信：给出命令 id 和参数，拿返回值或 `CommandError`。调用方不知道处理函数写在哪个插件或哪个模块里。

```ts
import { executeCommand, executeCommandSync } from '../extensions'

const sessions = await executeCommand('terminal.list')
const same = executeCommandSync('terminal.list')
```

表在启动时是空的。谁调用 `registerCommand`，表里才有谁。这次只有终端插件在 `activate` 里注册了三条。会话选中这类能力以后由那个模块自己注册，调用方式不变。

插件由 [`registry.ts`](../app/web/src/extensions/registry.ts) 在加载时调用一次 `activate`，并留着返回的 disposable。没有 `activate` 的插件（现在的文件插件）行为不变。其它模块如果要注册，模块本身必须被应用加载到；只写了 `registerCommand` 但没有任何 import 链拉到它，命令不会出现。

## 类型

`CommandMap` 是一个空接口，靠 `declare module` 扩充，不在 `commands.ts` 里写死联合类型。每条命令三个字段：

- `args`：无参数写 `void`。有参数写对象。对象字段都是可选时，调用可以不传第二参数。
- `result`：返回值。没有有用的返回值就写 `void`。
- `sync`：字面量 `true` 或 `false`，不能写 `boolean`。

`executeCommand` 的 id 只能是 `keyof CommandMap`，返回 `Promise<result>`。同步命令的结果会被包进已完成的 Promise。`executeCommandSync` 只能传入 `sync: true` 的 id，直接返回 `result`。`terminal.open` 这种 `sync: false` 在类型上就不能传给它。

`registerCommand` 用同一套键。`sync: true` 的处理函数不能返回 Promise；`sync: false` 可以返回值或 Promise。只改实现、不扩充 `CommandMap`，注册那一行过不了类型检查。

仓库内的扩充写在注册所在的文件里，模块路径指向 `commands.ts`，并且带 `.ts` 后缀，和本仓库的 import 一致。终端插件写的是 `declare module '../../commands.ts'`。这个文件必须被编译进来（注册表 import 了该插件），补全里才会出现这些 id。

[`commands.typecheck.ts`](../app/web/src/extensions/commands.typecheck.ts) 只给 `tsc` 用，应用入口不要 import 它。里面用 `@ts-expect-error` 钉住「异步命令不能同步调用」「缺参数」「未知 id」「同步处理函数不能是 async」。

## 运行时

- `executeCommand(id, args?)` 始终返回 Promise。处理函数同步抛出的错误会变成 reject。
- `executeCommandSync(id, args?)` 在处理函数返回 Promise 时抛 `CommandError`，code 是 `ASYNC`，不把 Promise 交出去。
- 同一个 id 再注册一次抛 `DUPLICATE`。`dispose()` 之后可以重新注册。
- 没有这条命令时，`executeCommand` reject、`executeCommandSync` 抛出，code 都是 `NOT_FOUND`。
- 命令 id 约定为 `插件id.动作` 或 `模块id.动作`。总线不检查前缀。

## 终端的三条命令

都由终端插件注册，宿主没有内置终端命令。欢迎页和「+」菜单仍走 `createTerminalOpen`，那里不等待 `pty.create`。命令这条路径会等待槽位建好，紧接着的写入才能进队列。

`terminal.open`，`sync: false`。参数 `{ cwd?: string }`，可以不传。未传 `cwd` 时用当前对话的 `currentExtensionCwd()`。新建会话，打开标题为「终端」的 tab，并展开右栏。返回 `{ sessionId, tabId }`。每次都是新会话。

`terminal.exec`，`sync: false`。参数 `{ sessionId: string; command: string }`，两个字段都必填。只在当前终端 tab 里找这个 `sessionId`，找不到抛 `NOT_FOUND`，不新建终端。展开右栏，激活该 tab，再写入。`command` 末尾没有 `\n` 或 `\r` 时补一个 `\r`。返回 `void`，表示这一行已经交给 pty（套接字还没就绪时会排队），不等待 shell 跑完，也不取回输出。

`terminal.list`，`sync: true`，无参数。返回当前终端 tab 的 `{ sessionId, tabId, title, active }[]`。没有有效 `sessionId` 的 tab 不算。不改界面。`executeCommand` 和 `executeCommandSync` 都可以。

## 仓库外的插件

包导出一个符合 `ExtensionPlugin` 的对象，在 `activate(ctx)` 里用 `ctx.commands.registerCommand` 注册。宿主把它放进 `extensionPlugins`。这次不做动态加载。

仓库外的包现在还扩充不到 `CommandMap`。`declare module` 认的是模块路径，而命令模块还在 `app/web` 里。抽到 `packages/` 时，扩充目标从相对路径改成包名。抽包要先说明包名和原因，同意后再做。这次不新建包。
