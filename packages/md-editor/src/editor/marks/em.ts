import type { MarkSpec } from 'prosemirror-model'

export const em: MarkSpec = {
	parseDOM: [{ tag: 'em' }],
	toDOM() {
		return ['em', 0]
	},
}

export type EmMarkJson = { type: 'em' }
