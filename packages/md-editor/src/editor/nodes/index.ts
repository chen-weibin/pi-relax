import { blockquote } from './blockquote.ts'
import { doc } from './doc.ts'
import { heading } from './heading.ts'
import { horizontalRule } from './horizontalRule.ts'
import { paragraph } from './paragraph.ts'
import { text } from './text.ts'

export const nodes = {
	doc,
	paragraph,
	heading,
	blockquote,
	horizontal_rule: horizontalRule,
	text,
}
