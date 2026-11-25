import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules'
import type { MarkType, ResolvedPos } from 'prosemirror-model'
import { Plugin, TextSelection, type Command, type EditorState, type Transaction } from 'prosemirror-state'
import { editorSchema } from '../schema.ts'

const hashes = /^(#{1,6})\s$/
const quote = /^\s*>\s$/
const bullet = /^\s*([-+*])\s$/
const ordered = /^(\d+)\.\s$/
const ruleText = /^(-{3,}|\*{3,})$/
const rule = /^(-{3,}|\*{3,}) $/
const taskMarker = /^\[( |x|X)\] $/

const { heading, blockquote, bullet_list, ordered_list, horizontal_rule, task_list, task_item } = editorSchema.nodes
const { strong, em, code, strike, link } = editorSchema.marks
const skipCode = { inCodeMark: false } as const

export const blockInputRules = inputRules({
	rules: [
		textblockTypeInputRule(hashes, {
			nodeType: heading,
			getAttrs: (match) => ({ level: match[1]?.length ?? 1 }),
			...skipCode,
		}),
		wrappingInputRule(quote, { nodeType: blockquote, ...skipCode }),
		wrappingInputRule(bullet, { nodeType: bullet_list, ...skipCode }),
		wrappingInputRule(ordered, {
			nodeType: ordered_list,
			getAttrs: (match) => ({ order: Number(match[1]) }),
			joinPredicate: (match, node) => node.childCount + node.attrs.order === Number(match[1]),
			...skipCode,
		}),
		taskListRule(),
		horizontalRuleRule(),
		markRule(/\*\*([^*]+)\*\*$/, strong),
		markRule(/__([^_]+)__$/, strong),
		markRule(/(?<!\*)\*([^*]+)\*$/, em),
		markRule(/(?<!_)_([^_]+)_$/, em),
		markRule(/`([^`]+)`$/, code),
		markRule(/~~([^~]+)~~$/, strike),
		linkRule(),
	],
})

function markRule(regexp: RegExp, type: MarkType) {
	return new InputRule(
		regexp,
		(state, match, start, end) => {
			const value = match[1]
			if (!value) return null
			return state.tr.replaceWith(start, end, state.schema.text(value, [type.create()]))
		},
		skipCode,
	)
}

const linkSource = /\[([^\]]+)\]\(([^)\s]+)\)/g

function linkRule() {
	return new InputRule(
		/\[([^\]]+)\]\(([^)\s]+)\)$/,
		(state, match, start, end) => {
			const text = match[1]
			const href = match[2]
			if (!text || !href) return null
			return state.tr.replaceWith(start, end, state.schema.text(text, [link.create({ href })]))
		},
		skipCode,
	)
}

/** 输入规则只在逐字输入时跑。粘贴整段 `[文字](url)` 不经过它，这里在变更后补一次。 */
export const linkSyntaxPlugin = new Plugin({
	appendTransaction(transactions, _old, state) {
		if (!transactions.some((tr) => tr.docChanged)) return null
		const ranges: { from: number; to: number; text: string; href: string }[] = []
		state.doc.descendants((node, pos) => {
			if (!node.isText || !node.text || code.isInSet(node.marks)) return
			for (const match of node.text.matchAll(new RegExp(linkSource))) {
				const text = match[1]
				const href = match[2]
				if (!text || !href || match.index === undefined) continue
				ranges.push({ from: pos + match.index, to: pos + match.index + match[0].length, text, href })
			}
		})
		if (ranges.length === 0) return null
		let tr = state.tr
		for (const range of ranges.reverse()) {
			tr = tr.replaceWith(range.from, range.to, state.schema.text(range.text, [link.create({ href: range.href })]))
		}
		return tr
	},
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
	}, skipCode)
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
	}, skipCode)
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
