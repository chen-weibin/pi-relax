import type { BlockquoteJson } from './nodes/blockquote'
import type { HeadingJson } from './nodes/heading'
import type { ParagraphJson } from './nodes/paragraph'
import type { TextJson } from './nodes/text'

export type { BlockquoteJson, HeadingJson, ParagraphJson, TextJson }

export type InlineJson = TextJson

export type BlockJson = ParagraphJson | HeadingJson | BlockquoteJson

export type DocJson = {
	type: 'doc'
	content: [BlockJson, ...BlockJson[]]
}
