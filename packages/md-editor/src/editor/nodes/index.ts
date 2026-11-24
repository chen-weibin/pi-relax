import { blockquote } from './blockquote.ts'
import { bulletList } from './bulletList.ts'
import { doc } from './doc.ts'
import { heading } from './heading.ts'
import { horizontalRule } from './horizontalRule.ts'
import { listItem } from './listItem.ts'
import { orderedList } from './orderedList.ts'
import { paragraph } from './paragraph.ts'
import { text } from './text.ts'

export const nodes = {
	doc,
	paragraph,
	heading,
	blockquote,
	horizontal_rule: horizontalRule,
	bullet_list: bulletList,
	ordered_list: orderedList,
	list_item: listItem,
	text,
}
