import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { history } from 'prosemirror-history'
import { TextSelection, type Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { createEditorState } from './EditorCore.ts'
import { docJsonToMarkdown, markdownToDocJson } from './json.ts'
import { createEditorPlugins } from './plugins/keymap.ts'
import { blockInputRules, horizontalRuleOnEnter } from './plugins/inputRules.ts'
import type { DocJson } from './types.ts'

function paragraph(text: string): DocJson {
	return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } as DocJson
}

function endOfFirstBlock(value: DocJson) {
	const state = createEditorState(value, createEditorPlugins(history()))
	return state.selection.$from.end()
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

function pressEnter(value: DocJson, at?: number) {
	const plugins = createEditorPlugins(history())
	let state = createEditorState(value, plugins)
	const pos = at ?? state.selection.$from.end()
	state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
	let next = state
	const handled = horizontalRuleOnEnter(state, (transaction) => {
		next = state.apply(transaction)
	})
	return { handled, state: next }
}

describe('horizontal rule', () => {
	it('round-trips thematic breaks as ---', () => {
		const line = markdownToDocJson('---')
		assert.equal(line.content[0]?.type, 'horizontal_rule')
		assert.equal(docJsonToMarkdown(line), '---')

		const stars = markdownToDocJson('***')
		assert.equal(stars.content[0]?.type, 'horizontal_rule')
		assert.equal(docJsonToMarkdown(stars), '---')

		const underscores = markdownToDocJson('___')
		assert.equal(underscores.content[0]?.type, 'horizontal_rule')
		assert.equal(docJsonToMarkdown(underscores), '---')

		const pair = markdownToDocJson('甲\n\n---\n\n乙')
		assert.equal(pair.content.length, 3)
		assert.equal(pair.content[0]?.type, 'paragraph')
		assert.equal(pair.content[1]?.type, 'horizontal_rule')
		assert.equal(pair.content[2]?.type, 'paragraph')
		assert.equal(docJsonToMarkdown(pair), '甲\n\n---\n\n乙')

		const quoted = markdownToDocJson('> ---')
		const quote = quoted.content[0]
		assert.equal(quote?.type, 'blockquote')
		assert.equal(quote?.type === 'blockquote' && quote.content[0]?.type, 'horizontal_rule')
		assert.equal(docJsonToMarkdown(quoted), '> ---')
	})

	it('turns three or more dashes or stars after a space or Enter', () => {
		const turned = typeAt(paragraph('---'), endOfFirstBlock(paragraph('---')), ' ')
		assert.equal(turned.handled, true)
		assert.equal(turned.state.doc.childCount, 2)
		assert.equal(turned.state.doc.firstChild?.type.name, 'horizontal_rule')
		assert.equal(turned.state.doc.child(1).type.name, 'paragraph')
		assert.equal(turned.state.doc.child(1).content.size, 0)
		assert.equal(turned.state.selection.$from.parent.type.name, 'paragraph')
		assert.equal(turned.state.doc.textContent, '')

		for (const text of ['----', '***', '****']) {
			const starred = typeAt(paragraph(text), endOfFirstBlock(paragraph(text)), ' ')
			assert.equal(starred.handled, true)
			assert.equal(starred.state.doc.firstChild?.type.name, 'horizontal_rule')
		}

		const between = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: '---' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: '乙' }] },
			],
		} as DocJson
		const kept = typeAt(between, endOfFirstBlock(between), ' ')
		assert.equal(kept.handled, true)
		assert.equal(kept.state.doc.childCount, 2)
		assert.equal(kept.state.doc.child(1).textContent, '乙')
		assert.equal(kept.state.selection.$from.parent.textContent, '乙')

		for (const [text, typed] of [
			['---', '-'],
			['--', ' '],
			['___', ' '],
			['---x', ' '],
		] as const) {
			const ignored = typeAt(paragraph(text), endOfFirstBlock(paragraph(text)), typed)
			assert.equal(ignored.handled, false)
			assert.equal(ignored.state.doc.firstChild?.type.name, 'paragraph')
			assert.equal(ignored.state.doc.textContent, text)
		}

		const entered = pressEnter(paragraph('----'))
		assert.equal(entered.handled, true)
		assert.equal(entered.state.doc.firstChild?.type.name, 'horizontal_rule')
		assert.equal(entered.state.doc.child(1).content.size, 0)

		const stars = pressEnter(paragraph('***'))
		assert.equal(stars.handled, true)
		assert.equal(stars.state.doc.firstChild?.type.name, 'horizontal_rule')

		const prose = pressEnter(paragraph('hello'))
		assert.equal(prose.handled, false)
		assert.equal(prose.state.doc.firstChild?.type.name, 'paragraph')

		const middle = pressEnter(paragraph('----'), 3)
		assert.equal(middle.handled, false)
		assert.equal(middle.state.doc.textContent, '----')
	})
})
