import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules'
import type { ResolvedPos } from 'prosemirror-model'
import { TextSelection, type Command, type EditorState, type Transaction } from 'prosemirror-state'
import { editorSchema } from '../schema.ts'

const hashes = /^(#{1,6})\s$/
const quote = /^\s*>\s$/
const ruleText = /^(-{3,}|\*{3,})$/
const rule = /^(-{3,}|\*{3,}) $/

export const blockInputRules = inputRules({
	rules: [
		textblockTypeInputRule(hashes, editorSchema.nodes.heading, (match) => ({
			level: match[1]?.length ?? 1,
		})),
		wrappingInputRule(quote, editorSchema.nodes.blockquote),
		horizontalRuleRule(),
	],
})

function horizontalRuleRule() {
	return new InputRule(rule, (state, _match, start, end) => {
		const $start = state.doc.resolve(start)
		const parent = $start.parent
		if (!parent.isTextblock || parent.content.size !== end - start) return null
		if (!ruleText.test(parent.textContent)) return null
		return replaceWithRule(state, $start)
	})
}

export const horizontalRuleOnEnter: Command = (state, dispatch) => {
	const { $from, empty } = state.selection
	if (!empty || !$from.parent.isTextblock || $from.parentOffset !== $from.parent.content.size) return false
	if (!ruleText.test($from.parent.textContent)) return false
	dispatch?.(replaceWithRule(state, $from))
	return true
}

function replaceWithRule(state: EditorState, $inside: ResolvedPos): Transaction {
	const hr = editorSchema.nodes.horizontal_rule.create()
	const from = $inside.before()
	let tr = state.tr.replaceWith(from, $inside.after(), hr)
	const $hr = tr.doc.resolve(from)
	if ($hr.index() < $hr.parent.childCount - 1) {
		return tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1), 1))
	}
	const insertAt = from + hr.nodeSize
	tr = tr.insert(insertAt, editorSchema.nodes.paragraph.create())
	return tr.setSelection(TextSelection.create(tr.doc, insertAt + 1))
}
