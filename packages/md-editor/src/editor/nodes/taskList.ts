import type { NodeSpec } from 'prosemirror-model'
import type { TaskItemJson } from './taskItem'

export const taskList: NodeSpec = {
	content: 'task_item+',
	group: 'block',
	parseDOM: [{ tag: 'ul.mded-task-list', priority: 60 }],
	toDOM() {
		return ['ul', { class: 'mded-task-list' }, 0]
	},
}

export type TaskListJson = {
	type: 'task_list'
	content: [TaskItemJson, ...TaskItemJson[]]
}
