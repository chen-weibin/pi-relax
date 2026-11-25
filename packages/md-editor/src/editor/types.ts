import type { BlockquoteJson } from './nodes/blockquote'
import type { BulletListJson } from './nodes/bulletList'
import type { HeadingJson } from './nodes/heading'
import type { HorizontalRuleJson } from './nodes/horizontalRule'
import type { ListItemJson } from './nodes/listItem'
import type { OrderedListJson } from './nodes/orderedList'
import type { ParagraphJson } from './nodes/paragraph'
import type { TaskItemJson } from './nodes/taskItem'
import type { TaskListJson } from './nodes/taskList'
import type { MarkJson } from './marks/index.ts'
import type { TextJson } from './nodes/text'

export type { MarkJson, TextJson }

export type {
	BlockquoteJson,
	BulletListJson,
	HeadingJson,
	HorizontalRuleJson,
	ListItemJson,
	OrderedListJson,
	ParagraphJson,
	TaskItemJson,
	TaskListJson,
}

export type InlineJson = TextJson

export type BlockJson =
	| ParagraphJson
	| HeadingJson
	| BlockquoteJson
	| HorizontalRuleJson
	| BulletListJson
	| OrderedListJson
	| TaskListJson

export type DocJson = {
	type: 'doc'
	content: [BlockJson, ...BlockJson[]]
}
