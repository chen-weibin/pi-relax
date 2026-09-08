import { defineConfig } from 'tsdown'

export const sharedOptions = defineConfig({
	format: ['esm'],
	dts: true,
	// ponytail: 关掉 clean —— watch 模式下每次重建先删后写,
	// 与并行启动的 server 形成 race(dist/index.mjs 短暂不存在)。
	// dist 文件名稳定,直接覆盖即可。
	clean: false,
	sourcemap: true,
})
