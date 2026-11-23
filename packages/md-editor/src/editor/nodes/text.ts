import type { NodeSpec } from 'prosemirror-model'

export const text: NodeSpec = {
	group: 'inline',
}

export type TextJson = {
	type: 'text'
	text: string
}
