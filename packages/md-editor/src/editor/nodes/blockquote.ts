import type { NodeSpec } from 'prosemirror-model'
import type { BlockJson } from '../types'

export const blockquote: NodeSpec = {
	content: 'block+',
	group: 'block',
	defining: true,
	parseDOM: [{ tag: 'blockquote' }],
	toDOM() {
		return ['blockquote', 0]
	},
}

export type BlockquoteJson = {
	type: 'blockquote'
	content: [BlockJson, ...BlockJson[]]
}
