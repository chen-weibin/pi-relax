import { inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules'
import { editorSchema } from '../schema.ts'

const hashes = /^(#{1,6})\s$/
const quote = /^\s*>\s$/

export const blockInputRules = inputRules({
	rules: [
		textblockTypeInputRule(hashes, editorSchema.nodes.heading, (match) => ({
			level: match[1]?.length ?? 1,
		})),
		wrappingInputRule(quote, editorSchema.nodes.blockquote),
	],
})
