import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { baseKeymap } from 'prosemirror-commands'
import { history } from 'prosemirror-history'
import { TextSelection, type EditorState, type Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { createEditorState } from './EditorCore.ts'
import { docJsonToMarkdown, markdownToDocJson } from './json.ts'
import { commandBindings, createEditorPlugins, enterCommand } from './plugins/keymap.ts'
import { blockInputRules } from './plugins/inputRules.ts'
import { isTaskCheckboxPoint } from './plugins/taskList.ts'
import type { DocJson } from './types.ts'

function applyCommand(state: EditorState, command: ReturnType<typeof commandBindings>[string]) {
	let next = state
	const handled = command(state, (transaction: Transaction) => {
		next = state.apply(transaction)
	})
	return { handled, state: next }
}

function typeAt(value: DocJson, from: number, text: string) {
	const plugins = createEditorPlugins(history())
	const view = {
		composing: false,
		state: createEditorState(value, plugins),
		dispatch(transaction: Transaction) {
			view.state = view.state.apply(transaction)
		},
	}
	const handled = blockInputRules.props.handleTextInput?.call(
		blockInputRules,
		view as unknown as EditorView,
		from,
		from,
		text,
		() => view.state.tr,
	)
	return { handled, state: view.state }
}

function contentPos(value: DocJson) {
	const state = createEditorState(value, createEditorPlugins(history()))
	let pos = 1
	state.doc.descendants((node, nodePos) => {
		if (node.isTextblock) pos = nodePos + 1
	})
	return pos
}

function textEnd(value: DocJson, text: string) {
	const state = createEditorState(value, createEditorPlugins(history()))
	let pos = 1
	state.doc.descendants((node, nodePos) => {
		if (node.isText && node.text === text) pos = nodePos + text.length
	})
	return pos
}

function selectText(value: DocJson, text: string) {
	const state = createEditorState(value, createEditorPlugins(history()))
	return state.apply(state.tr.setSelection(TextSelection.create(state.doc, textEnd(value, text))))
}

function enterAt(value: DocJson, at: number) {
	const state = createEditorState(value, createEditorPlugins(history()))
	const placed = state.apply(state.tr.setSelection(TextSelection.create(state.doc, at)))
	const split = applyCommand(placed, enterCommand)
	if (split.handled) return split
	const lift = baseKeymap.Enter
	assert.ok(lift)
	return applyCommand(placed, lift)
}

describe('lists', () => {
	it('round-trips bullet and ordered lists', () => {
		const bullets = markdownToDocJson('- 甲\n- 乙')
		assert.equal(bullets.content[0]?.type, 'bullet_list')
		assert.equal(bullets.content[0]?.type === 'bullet_list' && bullets.content[0].content.length, 2)
		assert.equal(docJsonToMarkdown(bullets), '- 甲\n- 乙')
		assert.equal(docJsonToMarkdown(markdownToDocJson('+ 甲')), '- 甲')
		assert.equal(docJsonToMarkdown(markdownToDocJson('* 甲')), '- 甲')

		const ordered = markdownToDocJson('3. 甲\n4. 乙')
		const orderedList = ordered.content[0]
		assert.equal(orderedList?.type, 'ordered_list')
		assert.equal(orderedList?.type === 'ordered_list' && orderedList.attrs.order, 3)
		assert.equal(docJsonToMarkdown(ordered), '3. 甲\n4. 乙')
		assert.equal(docJsonToMarkdown(markdownToDocJson('1) 甲')), '1. 甲')

		const task = markdownToDocJson('- [ ] 待办')
		const taskList = task.content[0]
		assert.equal(taskList?.type, 'task_list')
		assert.equal(taskList?.type === 'task_list' && taskList.content[0]?.attrs.checked, false)
		assert.equal(taskList?.type === 'task_list' && taskList.content[0]?.content[0]?.content?.[0]?.text, '待办')
		assert.equal(docJsonToMarkdown(task), '- [ ] 待办')

		const quoted = markdownToDocJson('> - 甲\n> - 乙')
		const quote = quoted.content[0]
		assert.equal(quote?.type, 'blockquote')
		assert.equal(quote?.type === 'blockquote' && quote.content[0]?.type, 'bullet_list')
		assert.equal(docJsonToMarkdown(quoted), '> - 甲\n> - 乙')

		const nested = markdownToDocJson('- 甲\n  - 乙')
		assert.equal(docJsonToMarkdown(nested), '- 甲\n  - 乙')

		const loose = markdownToDocJson('- 甲\n\n  乙')
		assert.equal(docJsonToMarkdown(loose), '- 甲\n\n  乙')
	})

	it('wraps - + * and a continuing ordered number', () => {
		for (const marker of ['- ', '+ ', '* ']) {
			const typed = typeAt({ type: 'doc', content: [{ type: 'paragraph' }] }, 1, marker)
			assert.equal(typed.handled, true)
			assert.equal(typed.state.doc.firstChild?.type.name, 'bullet_list')
			assert.equal(typed.state.doc.textContent, '')
		}

		const joined = {
			type: 'doc',
			content: [
				{
					type: 'bullet_list',
					content: [{ type: 'list_item', content: [{ type: 'paragraph', content: [{ type: 'text', text: '已有' }] }] }],
				},
				{ type: 'paragraph' },
			],
		} as DocJson
		const bullet = typeAt(joined, contentPos(joined), '- ')
		assert.equal(bullet.handled, true)
		assert.equal(bullet.state.doc.childCount, 1)
		assert.equal(bullet.state.doc.firstChild?.childCount, 2)

		const continued = {
			type: 'doc',
			content: [
				{
					type: 'ordered_list',
					attrs: { order: 1 },
					content: [{ type: 'list_item', content: [{ type: 'paragraph', content: [{ type: 'text', text: '甲' }] }] }],
				},
				{ type: 'paragraph' },
			],
		} as DocJson
		const next = typeAt(continued, contentPos(continued), '2. ')
		assert.equal(next.handled, true)
		assert.equal(next.state.doc.childCount, 1)
		assert.equal(next.state.doc.firstChild?.attrs.order, 1)
		assert.equal(next.state.doc.firstChild?.childCount, 2)

		const fresh = typeAt(continued, contentPos(continued), '1. ')
		assert.equal(fresh.handled, true)
		assert.equal(fresh.state.doc.childCount, 2)
		assert.equal(fresh.state.doc.lastChild?.attrs.order, 1)
	})

	it('splits a filled item and lifts an empty one', () => {
		const filled = markdownToDocJson('- 甲')
		const split = enterAt(filled, textEnd(filled, '甲'))
		assert.equal(split.handled, true)
		assert.equal(split.state.doc.firstChild?.childCount, 2)
		assert.equal(split.state.doc.textContent, '甲')

		const emptied = markdownToDocJson('- 甲\n-')
		const lifted = enterAt(emptied, contentPos(emptied))
		assert.equal(lifted.handled, true)
		assert.equal(lifted.state.doc.childCount, 2)
		assert.equal(lifted.state.doc.firstChild?.type.name, 'bullet_list')
		assert.equal(lifted.state.doc.firstChild?.childCount, 1)
		assert.equal(lifted.state.doc.lastChild?.type.name, 'paragraph')
	})

	it('sinks the current item and lifts it back', () => {
		const bindings = commandBindings()
		const sink = bindings.Tab
		const lift = bindings['Shift-Tab']
		assert.ok(sink)
		assert.ok(lift)

		const bullets = markdownToDocJson('- 甲\n- 乙')
		const sunk = applyCommand(selectText(bullets, '乙'), sink)
		assert.equal(sunk.handled, true)
		assert.equal(docJsonToMarkdown(sunk.state.doc.toJSON() as DocJson), '- 甲\n  - 乙')
		const lifted = applyCommand(sunk.state, lift)
		assert.equal(lifted.handled, true)
		assert.equal(docJsonToMarkdown(lifted.state.doc.toJSON() as DocJson), '- 甲\n- 乙')

		const first = applyCommand(selectText(bullets, '甲'), sink)
		assert.equal(first.handled, false)

		const ordered = markdownToDocJson('1. 甲\n2. 乙')
		const numbered = applyCommand(selectText(ordered, '乙'), sink)
		assert.equal(numbered.handled, true)
		assert.equal(docJsonToMarkdown(numbered.state.doc.toJSON() as DocJson), '1. 甲\n   1. 乙')
	})

	it('binds list shortcuts and keeps --- inside an item', () => {
		const paragraph = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '甲' }] }] } as DocJson
		const state = createEditorState(paragraph, createEditorPlugins(history()))
		const bindings = commandBindings()
		const bullet = bindings['Mod-Shift-8']
		const ordered = bindings['Mod-Shift-7']
		assert.ok(bullet)
		assert.ok(ordered)
		const unordered = applyCommand(state, bullet)
		assert.equal(unordered.handled, true)
		assert.equal(unordered.state.doc.firstChild?.type.name, 'bullet_list')
		const numbered = applyCommand(state, ordered)
		assert.equal(numbered.handled, true)
		assert.equal(numbered.state.doc.firstChild?.type.name, 'ordered_list')
		assert.equal(numbered.state.doc.firstChild?.attrs.order, 1)

		const ruled = {
			type: 'doc',
			content: [
				{
					type: 'bullet_list',
					content: [{ type: 'list_item', content: [{ type: 'paragraph', content: [{ type: 'text', text: '---' }] }] }],
				},
			],
		} as DocJson
		const kept = typeAt(ruled, textEnd(ruled, '---'), ' ')
		assert.equal(kept.handled, false)
		assert.equal(kept.state.doc.firstChild?.type.name, 'bullet_list')
	})
})

describe('task lists', () => {
	it('round-trips task markers and leaves ordered text alone', () => {
		assert.equal(docJsonToMarkdown(markdownToDocJson('- [x] 完成')), '- [x] 完成')
		assert.equal(docJsonToMarkdown(markdownToDocJson('- [X] 完成')), '- [x] 完成')
		const checked = markdownToDocJson('- [x] 完成').content[0]
		assert.equal(checked?.type === 'task_list' && checked.content[0]?.attrs.checked, true)

		const literal = markdownToDocJson('- [ ]待办')
		assert.equal(literal.content[0]?.type, 'bullet_list')
		assert.equal(docJsonToMarkdown(literal), '- [ ]待办')

		const ordered = markdownToDocJson('1. [x] 正文')
		assert.equal(ordered.content[0]?.type, 'ordered_list')
		assert.equal(docJsonToMarkdown(ordered), '1. [x] 正文')

		const mixed = markdownToDocJson('- 普通\n- [ ] 任务')
		assert.equal(mixed.content[0]?.type, 'bullet_list')
		assert.equal(mixed.content[1]?.type, 'task_list')
		assert.equal(docJsonToMarkdown(mixed), '- 普通\n\n- [ ] 任务')
		assert.equal(docJsonToMarkdown(markdownToDocJson('+ [ ] 甲')), '- [ ] 甲')
	})

	it('wraps a textblock and nests inside an existing list item', () => {
		const plain = typeAt({ type: 'doc', content: [{ type: 'paragraph' }] }, 1, '[ ] ')
		assert.equal(plain.handled, true)
		assert.equal(plain.state.doc.firstChild?.type.name, 'task_list')
		assert.equal(plain.state.doc.firstChild?.firstChild?.attrs.checked, false)
		assert.equal(plain.state.doc.textContent, '')

		const done = typeAt({ type: 'doc', content: [{ type: 'paragraph' }] }, 1, '[x] ')
		assert.equal(done.state.doc.firstChild?.firstChild?.attrs.checked, true)

		const kept = typeAt({ type: 'doc', content: [{ type: 'paragraph' }] }, 1, '[] ')
		assert.equal(kept.handled, false)
		assert.equal(kept.state.doc.firstChild?.type.name, 'paragraph')

		const ordered = {
			type: 'doc',
			content: [
				{
					type: 'ordered_list',
					attrs: { order: 1 },
					content: [{ type: 'list_item', content: [{ type: 'paragraph' }] }],
				},
			],
		} as DocJson
		const nested = typeAt(ordered, contentPos(ordered), '[ ] ')
		assert.equal(nested.handled, true)
		assert.equal(nested.state.doc.firstChild?.firstChild?.firstChild?.type.name, 'task_list')
		assert.equal(docJsonToMarkdown(nested.state.doc.toJSON() as DocJson), '1. \n   - [ ] ')

		const bullet = {
			type: 'doc',
			content: [
				{
					type: 'bullet_list',
					content: [{ type: 'list_item', content: [{ type: 'paragraph' }] }],
				},
			],
		} as DocJson
		const inside = typeAt(bullet, contentPos(bullet), '[x] ')
		assert.equal(inside.handled, true)
		assert.equal(inside.state.doc.firstChild?.firstChild?.firstChild?.type.name, 'task_list')
		assert.equal(inside.state.doc.firstChild?.firstChild?.firstChild?.firstChild?.attrs.checked, true)

		const again = typeAt(markdownToDocJson('- [ ] 待办'), contentPos(markdownToDocJson('- [ ] 待办')), '[ ] ')
		assert.equal(again.handled, false)
		assert.equal(again.state.doc.firstChild?.type.name, 'task_list')
		assert.equal(again.state.doc.textContent, '待办')
	})

	it('splits a filled task item into an unchecked one and lifts an empty one', () => {
		const filled = markdownToDocJson('- [x] 甲')
		const split = enterAt(filled, textEnd(filled, '甲'))
		assert.equal(split.handled, true)
		const list = split.state.doc.firstChild
		assert.equal(list?.childCount, 2)
		assert.equal(list?.firstChild?.attrs.checked, true)
		assert.equal(list?.lastChild?.attrs.checked, false)

		const emptied = {
			type: 'doc',
			content: [
				{
					type: 'task_list',
					content: [
						{
							type: 'task_item',
							attrs: { checked: false },
							content: [{ type: 'paragraph', content: [{ type: 'text', text: '甲' }] }],
						},
						{ type: 'task_item', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
					],
				},
			],
		} as DocJson
		const lifted = enterAt(emptied, contentPos(emptied))
		assert.equal(lifted.handled, true)
		assert.equal(lifted.state.doc.childCount, 2)
		assert.equal(lifted.state.doc.firstChild?.type.name, 'task_list')
		assert.equal(lifted.state.doc.lastChild?.type.name, 'paragraph')
	})

	it('hits the checkbox box and misses the text', () => {
		const fontSize = 16
		const itemLeft = 40
		const itemTop = 20
		assert.equal(
			isTaskCheckboxPoint({ x: itemLeft - fontSize * 1.45, y: itemTop + fontSize * 0.3, itemLeft, itemTop, fontSize }),
			true,
		)
		assert.equal(isTaskCheckboxPoint({ x: itemLeft + 4, y: itemTop + 4, itemLeft, itemTop, fontSize }), false)
	})
})
