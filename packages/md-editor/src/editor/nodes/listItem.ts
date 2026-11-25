import type { NodeSpec } from 'prosemirror-model'
import type { BlockJson, ParagraphJson } from '../types'
import type { TaskListJson } from './taskList'

export const listItem: NodeSpec = {
	content: '(paragraph | task_list) block*',
	defining: true,
	parseDOM: [
		{
			tag: 'li',
			getAttrs(dom) {
				return (dom as HTMLElement).classList.contains('mded-task') ? false : null
			},
		},
	],
	toDOM() {
		return ['li', 0]
	},
}

export type ListItemJson = {
	type: 'list_item'
	content: [ParagraphJson | TaskListJson, ...BlockJson[]]
}
