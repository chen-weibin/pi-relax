import type { HeadingJson } from './nodes/heading'
import type { ParagraphJson } from './nodes/paragraph'
import type { TextJson } from './nodes/text'

export type { HeadingJson, ParagraphJson, TextJson }

export type InlineJson = TextJson

export type BlockJson = ParagraphJson | HeadingJson

export type DocJson = {
	type: 'doc'
	content: [BlockJson, ...BlockJson[]]
}
