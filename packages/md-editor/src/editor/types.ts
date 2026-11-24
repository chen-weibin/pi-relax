import type { BlockquoteJson } from './nodes/blockquote'
import type { BulletListJson } from './nodes/bulletList'
import type { HeadingJson } from './nodes/heading'
import type { HorizontalRuleJson } from './nodes/horizontalRule'
import type { ListItemJson } from './nodes/listItem'
import type { OrderedListJson } from './nodes/orderedList'
import type { ParagraphJson } from './nodes/paragraph'
import type { TextJson } from './nodes/text'

export type {
	BlockquoteJson,
	BulletListJson,
	HeadingJson,
	HorizontalRuleJson,
	ListItemJson,
	OrderedListJson,
	ParagraphJson,
	TextJson,
}

export type InlineJson = TextJson

export type BlockJson = ParagraphJson | HeadingJson | BlockquoteJson | HorizontalRuleJson | BulletListJson | OrderedListJson

export type DocJson = {
	type: 'doc'
	content: [BlockJson, ...BlockJson[]]
}
