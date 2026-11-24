import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { history } from 'prosemirror-history'
import type { EditorState, Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { createEditorState } from './EditorCore.ts'
import { createEmptyDocJson, docJsonToMarkdown, markdownToDocJson } from './json.ts'
import { commandBindings, createEditorPlugins } from './plugins/keymap.ts'
import { headingInputRules } from './plugins/inputRules.ts'
import type { DocJson } from './types.ts'

const titled = {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: '标题' }] }],
} as DocJson

function applyCommand(state: EditorState, command: ReturnType<typeof commandBindings>[string]) {
	let next = state
	const handled = command(state, (transaction: Transaction) => {
		next = state.apply(transaction)
	})
	return { handled, state: next }
}

describe('heading', () => {
	it('round-trips headings and drops unknown blocks', () => {
		const first = markdownToDocJson('# 标题')
		assert.equal(first.content[0]?.type, 'heading')
		assert.equal(first.content[0]?.type === 'heading' && first.content[0].attrs.level, 1)
		assert.equal(docJsonToMarkdown(first), '# 标题')

		const sixth = markdownToDocJson('###### 六')
		assert.equal(sixth.content[0]?.type === 'heading' && sixth.content[0].attrs.level, 6)
		assert.equal(docJsonToMarkdown(sixth), '###### 六')

		const empty = markdownToDocJson('')
		assert.deepEqual(empty, createEmptyDocJson())
		assert.equal(docJsonToMarkdown(empty), '')

		const dropped = markdownToDocJson('> 引用')
		assert.equal(dropped.content[0]?.type, 'paragraph')
		assert.equal(dropped.content[0]?.content, undefined)

		assert.equal(docJsonToMarkdown(markdownToDocJson('标题\n===')), '# 标题')
		assert.equal(docJsonToMarkdown(markdownToDocJson('# **粗**')), '# 粗')
	})

	it('turns a hash prefix into a level-1 heading', () => {
		const plugins = createEditorPlugins(history())
		const view = {
			composing: false,
			state: createEditorState(undefined, plugins),
			dispatch(transaction: Transaction) {
				view.state = view.state.apply(transaction)
			},
		}
		const handled = headingInputRules.props.handleTextInput?.call(
			headingInputRules,
			view as unknown as EditorView,
			1,
			1,
			'# ',
		)
		assert.equal(handled, true)
		assert.equal(view.state.doc.firstChild?.type.name, 'heading')
		assert.equal(view.state.doc.firstChild?.attrs.level, 1)
		assert.equal(view.state.doc.textContent, '')
	})

	it('binds Mod-Alt heading keys and lets an empty list clear one', () => {
		const bindings = commandBindings()
		const turned = applyCommand(createEditorState(titled, createEditorPlugins(history())), bindings['Mod-Alt-2'])
		assert.equal(turned.handled, true)
		assert.equal(turned.state.doc.firstChild?.type.name, 'heading')
		assert.equal(turned.state.doc.firstChild?.attrs.level, 2)

		const cleared = commandBindings({ heading2: [] })
		assert.equal(cleared['Mod-Alt-2'], undefined)
		assert.equal(cleared['Mod-Alt-1'], bindings['Mod-Alt-1'])
	})
})
