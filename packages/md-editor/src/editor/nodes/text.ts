import type { NodeSpec } from 'prosemirror-model'
import type { MarkJson } from '../marks/index.ts'

export const text: NodeSpec = {
	group: 'inline',
}

export type TextJson = {
	type: 'text'
	text: string
	marks?: MarkJson[]
}
