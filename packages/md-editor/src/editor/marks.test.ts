import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { history } from 'prosemirror-history'
import { EditorState, TextSelection, type Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { createEditorState } from './EditorCore.ts'
import { docJsonToMarkdown, markdownToDocJson } from './json.ts'
import { commandBindings, createEditorPlugins, type MdEditorMode } from './plugins/keymap.ts'
import { linkClickPlugin } from './plugins/linkClick.ts'
import { blockInputRules } from './plugins/inputRules.ts'
import { editorSchema } from './schema.ts'
import { installTestDom } from './testDom.ts'
import type { DocJson } from './types.ts'

installTestDom()

function applyCommand(state: EditorState, command: ReturnType<typeof commandBindings>[string]) {
	let next = state
	const handled = command(state, (transaction: Transaction) => {
		next = state.apply(transaction)
	})
	return { handled, state: next }
}

function paragraph(text: string): DocJson {
	return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}

function typeChar(value: DocJson, char: string) {
	const plugins = createEditorPlugins(history())
	let state = createEditorState(value, plugins)
	const at = 1 + state.doc.textContent.length
	state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, at)))
	const view = {
		composing: false,
		state,
		dispatch(transaction: Transaction) {
			view.state = view.state.apply(transaction)
		},
	}
	const handled = blockInputRules.props.handleTextInput?.call(
		blockInputRules,
		view as unknown as EditorView,
		at,
		at,
		char,
		() => view.state.tr,
	)
	return { handled, state: view.state }
}

function markNames(state: EditorState) {
	const names: string[] = []
	state.doc.descendants((node) => {
		if (!node.isText) return
		for (const mark of node.marks) names.push(mark.type.name)
	})
	return names
}

function linkedView(mode: MdEditorMode, href: string) {
	const mount = document.createElement('div')
	const mark = editorSchema.marks.link.create({ href })
	const doc = editorSchema.node('doc', null, [
		editorSchema.node('paragraph', null, [editorSchema.text('文', [mark])]),
	])
	const view = new EditorView(mount, {
		state: EditorState.create({ schema: editorSchema, doc, plugins: [linkClickPlugin(mode)] }),
	})
	const anchor = mount.querySelector('a')
	assert.ok(anchor)
	return { view, anchor }
}

function mouse(target: EventTarget, init: { metaKey?: boolean; shiftKey?: boolean } = {}) {
	let defaultPrevented = false
	return {
		target,
		metaKey: init.metaKey ?? false,
		ctrlKey: false,
		shiftKey: init.shiftKey ?? false,
		get defaultPrevented() {
			return defaultPrevented
		},
		preventDefault() {
			defaultPrevented = true
		},
	} as MouseEvent
}

function fire(view: EditorView, type: 'click' | 'mousedown', event: MouseEvent) {
	for (const plugin of view.state.plugins) {
		const events = plugin.props.handleDOMEvents
		const handle = (type === 'click' ? events?.click : events?.mousedown) as
			| ((this: typeof plugin, view: EditorView, event: MouseEvent) => boolean | void)
			| undefined
		if (handle?.call(plugin, view, event)) return true
	}
	return false
}

describe('marks', () => {
	it('round-trips strong, em, code, strike, and links', () => {
		assert.equal(docJsonToMarkdown(markdownToDocJson('**粗**')), '**粗**')
		assert.equal(docJsonToMarkdown(markdownToDocJson('__粗__')), '**粗**')
		assert.equal(docJsonToMarkdown(markdownToDocJson('*斜*')), '*斜*')
		assert.equal(docJsonToMarkdown(markdownToDocJson('_斜_')), '*斜*')
		assert.equal(docJsonToMarkdown(markdownToDocJson('甲**粗**乙')), '甲**粗**乙')
		assert.equal(docJsonToMarkdown(markdownToDocJson('`码`')), '`码`')
		assert.equal(docJsonToMarkdown(markdownToDocJson('~~删~~')), '~~删~~')
		assert.equal(docJsonToMarkdown(markdownToDocJson('[文](https://a.com)')), '[文](https://a.com)')
		assert.equal(docJsonToMarkdown(markdownToDocJson('裸 https://a.com')), '裸 https://a.com')
		assert.equal(docJsonToMarkdown(markdownToDocJson('- [ ] **粗**')), '- [ ] **粗**')
	})

	it('closes bold before italic and keeps underscores normalized', () => {
		const bold = typeChar(paragraph('**粗*'), '*')
		assert.equal(bold.handled, true)
		assert.equal(bold.state.doc.textContent, '粗')
		assert.deepEqual(markNames(bold.state), ['strong'])

		const italic = typeChar(paragraph('*斜'), '*')
		assert.equal(italic.handled, true)
		assert.equal(italic.state.doc.textContent, '斜')
		assert.deepEqual(markNames(italic.state), ['em'])

		const underscored = typeChar(paragraph('__粗_'), '_')
		assert.deepEqual(markNames(underscored.state), ['strong'])
		const underscoredEm = typeChar(paragraph('_斜'), '_')
		assert.deepEqual(markNames(underscoredEm.state), ['em'])
	})

	it('does not run block or mark rules inside inline code', () => {
		const code = editorSchema.marks.code.create()
		const heading = editorSchema.node('doc', null, [
			editorSchema.node('paragraph', null, [editorSchema.text('#', [code])]),
		])
		const hashed = typeChar(heading.toJSON() as DocJson, ' ')
		assert.equal(hashed.handled, false)
		assert.equal(hashed.state.doc.firstChild?.type.name, 'paragraph')

		const bullet = editorSchema.node('doc', null, [
			editorSchema.node('paragraph', null, [editorSchema.text('*', [code])]),
		])
		const starred = typeChar(bullet.toJSON() as DocJson, ' ')
		assert.equal(starred.handled, false)
		assert.equal(starred.state.doc.firstChild?.type.name, 'paragraph')

		const coded = typeChar(paragraph('`码'), '`')
		assert.equal(coded.state.doc.textContent, '码')
		assert.deepEqual(markNames(coded.state), ['code'])
	})

	it('toggles marks from keys and leaves link href empty', () => {
		const bindings = commandBindings()
		const state = createEditorState(paragraph('文'), createEditorPlugins(history()))
		const ranged = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 2)))
		const bold = bindings['Mod-b']
		assert.ok(bold)
		const on = applyCommand(ranged, bold)
		assert.equal(on.handled, true)
		assert.deepEqual(markNames(on.state), ['strong'])
		assert.deepEqual(markNames(applyCommand(on.state, bold).state), [])

		const cleared = commandBindings({ bold: [] })
		assert.equal(cleared['Mod-b'], undefined)
		assert.equal(cleared['Mod-i'], bindings['Mod-i'])

		const link = bindings['Mod-k']
		assert.ok(link)
		const linked = applyCommand(ranged, link)
		const mark = linked.state.doc.firstChild?.firstChild?.marks.find((item) => item.type.name === 'link')
		assert.equal(mark?.attrs.href, '')

		const typed = typeChar(paragraph('[文](https://a.com'), ')')
		assert.equal(typed.state.doc.textContent, '文')
		assert.equal(typed.state.doc.firstChild?.firstChild?.marks[0]?.attrs.href, 'https://a.com')

		const plugins = createEditorPlugins(history())
		const empty = createEditorState({ type: 'doc', content: [{ type: 'paragraph' }] }, plugins)
		const pasted = empty.apply(empty.tr.insertText('见[百度](https://baidu.com)[乙](https://b.com)尾', 1))
		assert.equal(pasted.doc.textContent, '见百度乙尾')
		assert.equal(pasted.doc.firstChild?.child(0).text, '见')
		assert.equal(pasted.doc.firstChild?.child(1).marks[0]?.attrs.href, 'https://baidu.com')
		assert.equal(pasted.doc.firstChild?.child(2).marks[0]?.attrs.href, 'https://b.com')
		assert.equal(pasted.doc.firstChild?.child(3).text, '尾')

		const coded = editorSchema.node('doc', null, [
			editorSchema.node('paragraph', null, [editorSchema.text('[文](https://a.com)', [editorSchema.marks.code.create()])]),
		])
		const kept = createEditorState(coded.toJSON() as DocJson, plugins)
		const stillCode = kept.apply(kept.tr.insertText('x', kept.doc.content.size - 1))
		assert.equal(stillCode.doc.textContent, '[文](https://a.com)x')
		assert.equal(stillCode.doc.firstChild?.firstChild?.marks[0]?.type.name, 'code')
	})

	it('opens http links with a modifier in edit mode and directly in read mode', () => {
		const opened: string[] = []
		const box: { win: { opener: unknown } | null } = { win: null }
		const previous = window.open
		window.open = ((href: string) => {
			opened.push(String(href))
			box.win = { opener: 'live' }
			return box.win as Window
		}) as typeof window.open
		try {
			const edit = linkedView('edit', 'https://example.com')
			assert.equal(fire(edit.view, 'click', mouse(edit.anchor)), false)
			assert.deepEqual(opened, [])

			assert.equal(fire(edit.view, 'click', mouse(edit.anchor, { metaKey: true, shiftKey: true })), true)
			assert.deepEqual(opened, ['https://example.com'])
			assert.equal(box.win?.opener, null)

			const down = mouse(edit.anchor, { metaKey: true, shiftKey: true })
			assert.equal(down.defaultPrevented, false)
			assert.equal(fire(edit.view, 'mousedown', down), true)
			assert.equal(down.defaultPrevented, true)
			edit.view.destroy()

			opened.length = 0
			const read = linkedView('read', 'https://example.com')
			assert.equal(fire(read.view, 'click', mouse(read.anchor)), true)
			assert.deepEqual(opened, ['https://example.com'])
			read.view.destroy()

			opened.length = 0
			const script = linkedView('read', 'javascript:alert(1)')
			assert.equal(fire(script.view, 'click', mouse(script.anchor)), false)
			assert.deepEqual(opened, [])
			script.view.destroy()
		} finally {
			window.open = previous
		}
	})
})
