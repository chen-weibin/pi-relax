import { defineConfig } from 'tsdown'

export const sharedOptions = defineConfig({
	format: ['esm'],
	dts: true,
	clean: false,
	sourcemap: true,
})
