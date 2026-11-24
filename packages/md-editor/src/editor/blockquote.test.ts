import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { baseKeymap } from 'prosemirror-commands'
import { history } from 'prosemirror-history'
import { TextSelection, type EditorState, type Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { createEditorState } from './EditorCore.ts'
import { docJsonToMarkdown, markdownToDocJson } from './json.ts'
import { createEditorPlugins } from './plugins/keymap.ts'
import { blockInputRules } from './plugins/inputRules.ts'
import type { DocJson } from './types.ts'

function applyCommand(state: EditorState, command: (typeof baseKeymap)['Enter']) {
	let next = state
	const handled = command(state, (transaction: Transaction) => {
		next = state.apply(transaction)
	})
	return { handled, state: next }
}

describe('blockquote', () => {
	it('round-trips quotes and fills an empty quote', () => {
		const quote = markdownToDocJson('> 引用')
		assert.equal(quote.content[0]?.type, 'blockquote')
		assert.equal(docJsonToMarkdown(quote), '> 引用')

		const nested = markdownToDocJson('> > 内')
		const outer = nested.content[0]
		assert.equal(outer?.type, 'blockquote')
		assert.equal(outer?.type === 'blockquote' && outer.content[0]?.type, 'blockquote')
		assert.equal(docJsonToMarkdown(nested), '> > 内')

		const titled = markdownToDocJson('> # 标题')
		const titledQuote = titled.content[0]
		assert.equal(titledQuote?.type === 'blockquote' && titledQuote.content[0]?.type, 'heading')
		assert.equal(docJsonToMarkdown(titled), '> # 标题')

		const pair = markdownToDocJson('> 甲\n> \n> 乙')
		const pairQuote = pair.content[0]
		assert.equal(pairQuote?.type, 'blockquote')
		assert.equal(pairQuote?.type === 'blockquote' && pairQuote.content.length, 2)
		assert.equal(docJsonToMarkdown(pair), '> 甲\n> \n> 乙')

		const emptied = markdownToDocJson('> - 项')
		const emptyQuote = emptied.content[0]
		assert.equal(emptyQuote?.type, 'blockquote')
		assert.equal(emptyQuote?.type === 'blockquote' && emptyQuote.content.length, 1)
		assert.equal(emptyQuote?.type === 'blockquote' && emptyQuote.content[0]?.type, 'paragraph')
		assert.equal(emptyQuote?.type === 'blockquote' && emptyQuote.content[0]?.content, undefined)
	})

	it('wraps a paragraph on > and joins a following quote', () => {
		const plugins = createEditorPlugins(history())
		const view = {
			composing: false,
			state: createEditorState(undefined, plugins),
			dispatch(transaction: Transaction) {
				view.state = view.state.apply(transaction)
			},
		}
		const handled = blockInputRules.props.handleTextInput?.call(
			blockInputRules,
			view as unknown as EditorView,
			1,
			1,
			'> ',
			() => view.state.tr,
		)
		assert.equal(handled, true)
		assert.equal(view.state.doc.firstChild?.type.name, 'blockquote')
		assert.equal(view.state.doc.firstChild?.firstChild?.type.name, 'paragraph')
		assert.equal(view.state.doc.textContent, '')

		const adjacent = {
			type: 'doc',
			content: [
				{ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '已有' }] }] },
				{ type: 'paragraph' },
			],
		} as DocJson
		const joined = {
			composing: false,
			state: createEditorState(adjacent, plugins),
			dispatch(transaction: Transaction) {
				joined.state = joined.state.apply(transaction)
			},
		}
		const joinedHandled = blockInputRules.props.handleTextInput?.call(
			blockInputRules,
			joined as unknown as EditorView,
			7,
			7,
			'> ',
			() => joined.state.tr,
		)
		assert.equal(joinedHandled, true)
		assert.equal(joined.state.doc.childCount, 1)
		assert.equal(joined.state.doc.firstChild?.type.name, 'blockquote')
		assert.equal(joined.state.doc.firstChild?.childCount, 2)
		assert.equal(joined.state.doc.textContent, '已有')
	})

	it('lifts an empty paragraph out of a quote on Enter', () => {
		const enter = baseKeymap.Enter
		assert.ok(enter)
		const state = createEditorState(markdownToDocJson('>'), createEditorPlugins(history()))
		const inside = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2)))
		const lifted = applyCommand(inside, enter)
		assert.equal(lifted.handled, true)
		assert.equal(lifted.state.doc.childCount, 1)
		assert.equal(lifted.state.doc.firstChild?.type.name, 'paragraph')
	})
})
