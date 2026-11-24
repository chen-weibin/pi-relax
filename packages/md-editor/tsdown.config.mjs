import { defineConfig } from 'tsdown'
import { sharedOptions } from '../../tsdown.config.mjs'

export default defineConfig({
	...sharedOptions,
	entry: ['src/index.tsx'],
	platform: 'neutral',
	fixedExtension: false,
	deps: {
		neverBundle: [
			'react',
			'react-dom',
			'prosemirror-model',
			'prosemirror-state',
			'prosemirror-view',
			'prosemirror-commands',
			'prosemirror-keymap',
			'prosemirror-history',
			'prosemirror-inputrules',
			'prosemirror-schema-list',
			'markdown-it',
			/\.css$/,
		],
	},
})
