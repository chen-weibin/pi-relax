import type { NodeSpec } from 'prosemirror-model'
import type { ListItemJson } from './listItem'

export const orderedList: NodeSpec = {
	content: 'list_item+',
	group: 'block',
	attrs: { order: { default: 1 } },
	parseDOM: [
		{
			tag: 'ol',
			getAttrs(dom) {
				const start = (dom as HTMLElement).getAttribute('start')
				return { order: start == null ? 1 : Number(start) }
			},
		},
	],
	toDOM(node) {
		const order = node.attrs.order as number
		return order === 1 ? ['ol', 0] : ['ol', { start: order }, 0]
	},
}

export type OrderedListJson = {
	type: 'ordered_list'
	attrs: { order: number }
	content: [ListItemJson, ...ListItemJson[]]
}
