import type { MarkSpec } from 'prosemirror-model'

export const strong: MarkSpec = {
	parseDOM: [{ tag: 'strong' }],
	toDOM() {
		return ['strong', 0]
	},
}

export type StrongMarkJson = { type: 'strong' }
