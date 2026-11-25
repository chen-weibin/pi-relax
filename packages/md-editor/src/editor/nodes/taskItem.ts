import type { NodeSpec } from 'prosemirror-model'
import type { BlockJson, ParagraphJson } from '../types'

export const taskItem: NodeSpec = {
	content: 'paragraph block*',
	defining: true,
	attrs: { checked: { default: false } },
	parseDOM: [
		{
			tag: 'li.mded-task',
			priority: 60,
			getAttrs(dom) {
				return { checked: (dom as HTMLElement).dataset.checked === 'true' }
			},
		},
	],
	toDOM(node) {
		return ['li', { class: 'mded-task', 'data-checked': node.attrs.checked ? 'true' : 'false' }, 0]
	},
}

export type TaskItemJson = {
	type: 'task_item'
	attrs: { checked: boolean }
	content: [ParagraphJson, ...BlockJson[]]
}
