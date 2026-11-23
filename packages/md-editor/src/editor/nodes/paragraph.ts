import type { NodeSpec } from 'prosemirror-model'
import type { InlineJson } from '../types'

export const paragraph: NodeSpec = {
	content: 'inline*',
	group: 'block',
	parseDOM: [{ tag: 'p' }],
	toDOM() {
		return ['p', 0]
	},
}

export type ParagraphJson = {
	type: 'paragraph'
	content?: InlineJson[]
}
