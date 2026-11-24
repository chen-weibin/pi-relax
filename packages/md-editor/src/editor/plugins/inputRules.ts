import { inputRules, textblockTypeInputRule } from 'prosemirror-inputrules'
import { editorSchema } from '../schema.ts'

const hashes = /^(#{1,6})\s$/

export const headingInputRules = inputRules({
	rules: [
		textblockTypeInputRule(hashes, editorSchema.nodes.heading, (match) => ({
			level: match[1]?.length ?? 1,
		})),
	],
})
