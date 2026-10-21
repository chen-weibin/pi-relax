# 工作区包的开发入口

查阅时机：把一段实现抽成 `packages/` 里的包，给 web、server 或其他服务共用，或改这个包的 `exports`、tsdown 产物扩展名时。

本文是 2026-10-21 用临时包 `@relax/calc` 跑过的验证。验证代码已删除，仓库里没有这个包。消费方当时用 web 做了 Vite 路径，用 Node 做了默认入口和 `development` 条件。没有把包接到 `app/server`，没有跑 `vite build`，没有发 npm，没有验证 `publishConfig`。

## 链接不决定读哪份文件

`pnpm-workspace.yaml` 已经包含 `packages/*` 和 `app/*`。任一工作区项目的依赖写成 `"@relax/calc": "workspace:*"` 之后，该项目 `node_modules` 里的包名是指向 `packages/calc` 目录的符号链接。验证时链接出现在 `app/web/node_modules/@relax/calc`。server 或其他服务同样只是一条指向包目录的链接。

`workspace:*` 只决定装哪一个目录。`import` 读源码还是读 `dist`，看包自己的 `exports`，不看消费方是谁。

## 已验证的 exports

```json
{
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

条件按书写顺序匹配，命中第一个就停。包导出 `sum`，`sum([1, 2, 3])` 为 `6`。同一次调用打印 `import.meta.url`，用来确认加载的是哪一个文件。

| 解析方 | 命中的条件 | 实际文件 |
|---|---|---|
| Node 默认 `import` | `import` | `packages/calc/dist/index.js` |
| `node --conditions=development` | `development` | `packages/calc/src/index.ts` |
| Vite 开发服务器（`createServer` 后 `resolveId` 与 `ssrLoadModule`） | `development` | `packages/calc/src/index.ts` |

Node 不会自己带上 `development`。server 或其他 Node 服务若要在开发时直接加载源码，启动命令要加 `--conditions=development`，这次用 `node --conditions=development` 验证过。不加这个条件就走 `import`，读 `dist`，改源码要另开监听构建。

Vite 开发服务器自己带 `development` 条件，所以用 Vite 的消费方不用再加启动参数。Vite 生产构建带的是 `production`。这份 `exports` 里没有这个键，会落到 `import`，也就是 `dist`。这是条件顺序，不是对 `vite build` 产物的实测。

## 类型检查走 dist

[`tsconfig.base.json`](../tsconfig.base.json) 的 `customConditions` 是 `["source"]`，不是 `development`。继承它的 `tsc` 不选 `development`，走 `import` → `dist/index.js`，类型用旁边的 `dist/index.d.ts`。web 和这个包自己的 typecheck 都是这样通过的。server 的 tsconfig 同样继承这份 base，行为一样。

因此：

- 消费方跑 `tsc` 之前，包的 `dist` 必须已经构建。
- 根脚本 `pnpm build`（`pnpm -r build`）按依赖拓扑跑。谁依赖这个包，包的 `build` 就先跑。
- 开发进程若已经指向源码，不构建也能跑起来。`tsc` 仍会因为找不到 `dist` 失败。

若要让类型检查也看源码，在消费方 tsconfig 的 `customConditions` 里加上 `development`。这个数组会覆盖 base 里的值，还要用的条件要一起写上。这次没有改 base，也没有验证改过之后的 `tsc`。

`tsconfig.base.json` 的 `lib` 只有 `ES2022`，没有 DOM，包本身也没有 `@types/node`。包里写 `import.meta.url` 时，`tsc` 报 `Property 'url' does not exist on type 'ImportMeta'`。验证时在包内加了一份无 import/export 的 `ImportMeta` 声明才通过。不用 `import.meta.url` 则不需要这份声明。

## Vite 消费方要排除预构建

这一节只在消费方是 Vite 时用到。验证时写在 web 的 `vite.config.ts`：

```ts
optimizeDeps: {
  exclude: ['@relax/calc'],
}
```

这项只作用于 Vite 开发服务器。排除之后，浏览器拿到的是 `exports` 指向的真实文件，改 `src/index.ts` 才能热更新。不排除时，Vite 把依赖打进 `node_modules/.vite/deps`，源码改了页面不跟，要重启 dev server。

`vite build` 不读这项配置。生产构建仍按 `import` 把这个包打进消费方。Node 服务没有这一步。

## 打包

根目录已经依赖 `tsdown`，共享选项在根上的 [`tsdown.config.mjs`](../tsdown.config.mjs)（`format: ['esm']`、`dts: true`、`clean: false`、`sourcemap: true`）。包的配置复用 `sharedOptions`，并设置 `fixedExtension: false`。

不设 `fixedExtension: false` 时，tsdown 按 node 平台使用固定扩展名，产出 `dist/index.mjs` 和 `dist/index.d.mts`，对不上 `exports` 里的 `dist/index.js`。设了之后，`"type": "module"` 的包产出 `dist/index.js` 和 `dist/index.d.ts`。

`sharedOptions` 的 `clean` 是 `false`。扩展名从 `.mjs` 改成 `.js` 之后，旧的 `.mjs` 还留在 `dist/`。改扩展名时要自己删掉旧产物。

仓库根 `.gitignore` 忽略 `dist/`，构建产物不提交。
