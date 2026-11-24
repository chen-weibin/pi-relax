import type { NodeSpec } from 'prosemirror-model'
import type { ListItemJson } from './listItem'

export const bulletList: NodeSpec = {
	content: 'list_item+',
	group: 'block',
	parseDOM: [{ tag: 'ul' }],
	toDOM() {
		return ['ul', 0]
	},
}

export type BulletListJson = {
	type: 'bullet_list'
	content: [ListItemJson, ...ListItemJson[]]
}
