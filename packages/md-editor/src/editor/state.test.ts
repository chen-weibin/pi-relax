import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { history, redo, undo } from 'prosemirror-history'
import type { EditorState } from 'prosemirror-state'
import { createEditorState } from './EditorCore.ts'
import { createEmptyDocJson } from './json.ts'
import { commandBindings, createEditorPlugins } from './plugins/keymap.ts'
import { placeholderPlugin } from './plugins/placeholder.ts'
import type { DocJson } from './types.ts'

function stateFrom(value?: DocJson, keybindings?: Parameters<typeof createEditorPlugins>[1]) {
	return createEditorState(value, createEditorPlugins(history(), keybindings))
}

function applyUndo(state: EditorState) {
	let next = state
	const handled = undo(state, (transaction) => {
		next = state.apply(transaction)
	})
	return { handled, state: next }
}

const replaced = {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: '新' }] }],
} as DocJson

describe('editor state', () => {
	it('keeps an empty paragraph, undo, key overrides, and history after replace', () => {
		const empty = stateFrom()
		assert.deepEqual(empty.doc.toJSON(), createEmptyDocJson())

		const typed = empty.apply(empty.tr.insertText('ab'))
		const undone = applyUndo(typed)
		assert.equal(undone.handled, true)
		assert.deepEqual(undone.state.doc.toJSON(), createEmptyDocJson())

		const overridden = commandBindings({ undo: ['Mod-u'] })
		assert.equal(overridden['Mod-u'], undo)
		assert.equal(overridden['Mod-z'], undefined)
		assert.equal(overridden['Mod-Shift-z'], redo)
		assert.equal(overridden['Mod-y'], redo)
		const cleared = commandBindings({ redo: [] })
		assert.equal(cleared['Mod-z'], undo)
		assert.equal(cleared['Mod-Shift-z'], undefined)
		assert.equal(cleared['Mod-y'], undefined)

		const next = stateFrom(replaced)
		assert.equal(next.doc.textContent, '新')
		const again = applyUndo(next.apply(next.tr.insertText('x')))
		assert.equal(again.handled, true)
		assert.equal(again.state.doc.textContent, '新')
	})

	it('keeps editing plugins in edit mode and only the placeholder in read mode', () => {
		const historyPlugin = history()
		const edit = createEditorPlugins(historyPlugin)
		assert.equal(edit.length, 4)
		assert.equal(edit[0], historyPlugin)
		assert.equal(edit[3], placeholderPlugin)

		const read = createEditorPlugins(historyPlugin, undefined, 'read')
		assert.deepEqual(read, [placeholderPlugin])
	})
})
