import { defineConfig } from 'tsdown'
import { sharedOptions } from '../../tsdown.config.mjs'

export default defineConfig({
	...sharedOptions,
	entry: ['src/index.tsx'],
	platform: 'neutral',
	fixedExtension: false,
	deps: {
		neverBundle: ['react', 'react-dom'],
	},
})
