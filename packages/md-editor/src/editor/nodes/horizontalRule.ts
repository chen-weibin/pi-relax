import type { NodeSpec } from 'prosemirror-model'

export const horizontalRule: NodeSpec = {
	group: 'block',
	parseDOM: [{ tag: 'hr' }],
	toDOM() {
		return ['hr']
	},
}

export type HorizontalRuleJson = {
	type: 'horizontal_rule'
}
