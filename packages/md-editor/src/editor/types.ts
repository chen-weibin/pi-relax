import type { ParagraphJson } from './nodes/paragraph'
import type { TextJson } from './nodes/text'

export type { ParagraphJson, TextJson }

export type InlineJson = TextJson

export type BlockJson = ParagraphJson

export type DocJson = {
	type: 'doc'
	content: [BlockJson, ...BlockJson[]]
}
