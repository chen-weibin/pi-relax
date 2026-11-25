import type { MarkSpec } from 'prosemirror-model'

export const code: MarkSpec = {
	code: true,
	excludes: '_',
	parseDOM: [{ tag: 'code' }],
	toDOM() {
		return ['code', 0]
	},
}

export type CodeMarkJson = { type: 'code' }
