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
		const taskItem = task.content[0]
		assert.equal(taskItem?.type, 'bullet_list')
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
