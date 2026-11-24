import type { NodeSpec } from 'prosemirror-model'
import type { InlineJson } from '../types'

export const heading: NodeSpec = {
	attrs: { level: { default: 1 } },
	content: 'inline*',
	group: 'block',
	defining: true,
	parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}`, attrs: { level } })),
	toDOM(node) {
		return [`h${node.attrs.level}`, 0]
	},
}

export type HeadingJson = {
	type: 'heading'
	attrs: { level: number }
	content?: InlineJson[]
}
