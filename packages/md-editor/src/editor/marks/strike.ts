import type { MarkSpec } from 'prosemirror-model'

export const strike: MarkSpec = {
	parseDOM: [{ tag: 's' }, { tag: 'del' }],
	toDOM() {
		return ['s', 0]
	},
}

export type StrikeMarkJson = { type: 'strike' }
