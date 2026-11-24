import type { NodeSpec } from 'prosemirror-model'
import type { BlockJson, ParagraphJson } from '../types'

export const listItem: NodeSpec = {
	content: 'paragraph block*',
	defining: true,
	parseDOM: [{ tag: 'li' }],
	toDOM() {
		return ['li', 0]
	},
}

export type ListItemJson = {
	type: 'list_item'
	content: [ParagraphJson, ...BlockJson[]]
}
