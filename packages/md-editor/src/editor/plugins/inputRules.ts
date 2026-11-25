import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules'
import type { ResolvedPos } from 'prosemirror-model'
import { TextSelection, type Command, type EditorState, type Transaction } from 'prosemirror-state'
import { editorSchema } from '../schema.ts'

const hashes = /^(#{1,6})\s$/
const quote = /^\s*>\s$/
const bullet = /^\s*([-+*])\s$/
const ordered = /^(\d+)\.\s$/
const ruleText = /^(-{3,}|\*{3,})$/
const rule = /^(-{3,}|\*{3,}) $/
const taskMarker = /^\[( |x|X)\] $/

const { heading, blockquote, bullet_list, ordered_list, horizontal_rule, task_list, task_item } = editorSchema.nodes

export const blockInputRules = inputRules({
	rules: [
		textblockTypeInputRule(hashes, heading, (match) => ({
			level: match[1]?.length ?? 1,
		})),
		wrappingInputRule(quote, blockquote),
		wrappingInputRule(bullet, bullet_list),
		wrappingInputRule(
			ordered,
			ordered_list,
			(match) => ({ order: Number(match[1]) }),
			(match, node) => node.childCount + node.attrs.order === Number(match[1]),
		),
		taskListRule(),
		horizontalRuleRule(),
	],
})

function taskListRule() {
	return new InputRule(taskMarker, (state, match, start, end) => {
		if (insideTaskItem(state.doc.resolve(start))) return null
		const checked = match[1]?.toLowerCase() === 'x'
		let tr = state.tr.delete(start, end)
		const $inside = tr.doc.resolve(start)
		const block = $inside.parent
		if (!block.isTextblock) return null
		const parent = $inside.node(-1)
		const index = $inside.index(-1)
		if (!parent.canReplaceWith(index, index + 1, task_list)) return null
		const from = $inside.before()
		const wrapped = task_list.create(null, task_item.create({ checked }, block))
		tr = tr.replaceWith(from, from + block.nodeSize, wrapped)
		const cursor = from + 3 + block.content.size
		tr = tr.setSelection(TextSelection.create(tr.doc, cursor))
		const boundary = tr.doc.resolve(from)
		if (boundary.nodeBefore?.type === task_list && boundary.nodeAfter?.type === task_list) tr = tr.join(from)
		return tr
	})
}

function insideTaskItem($pos: ResolvedPos) {
	for (let depth = $pos.depth; depth > 0; depth -= 1) {
		if ($pos.node(depth).type === task_item) return true
	}
	return false
}

function horizontalRuleRule() {
	return new InputRule(rule, (state, _match, start, end) => {
		const $start = state.doc.resolve(start)
		const parent = $start.parent
		if (!parent.isTextblock || parent.content.size !== end - start) return null
		if (!ruleText.test(parent.textContent)) return null
		if (!canReplaceTextblock($start)) return null
		return replaceWithRule(state, $start)
	})
}

export const horizontalRuleOnEnter: Command = (state, dispatch) => {
	const { $from, empty } = state.selection
	if (!empty || !$from.parent.isTextblock || $from.parentOffset !== $from.parent.content.size) return false
	if (!ruleText.test($from.parent.textContent)) return false
	if (!canReplaceTextblock($from)) return false
	dispatch?.(replaceWithRule(state, $from))
	return true
}

function canReplaceTextblock($inside: ResolvedPos) {
	const depth = $inside.depth - 1
	if (depth < 0) return false
	return $inside.node(depth).canReplaceWith($inside.index(depth), $inside.index(depth) + 1, horizontal_rule)
}

function replaceWithRule(state: EditorState, $inside: ResolvedPos): Transaction {
	const hr = horizontal_rule.create()
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
