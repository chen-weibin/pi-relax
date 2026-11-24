import { history } from 'prosemirror-history'
import { EditorState, type Plugin, type Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { createEmptyDocJson } from './json.ts'
import { createEditorPlugins, type Keybindings } from './plugins/keymap.ts'
import { editorSchema } from './schema.ts'
import type { DocJson } from './types'

export type EditorCoreOptions = {
	mount: HTMLElement
	initialValue?: DocJson
	onChange?: (value: DocJson) => void
	keybindings?: Keybindings
}

export function createEditorState(value: DocJson | undefined, plugins: readonly Plugin[]) {
	const doc = editorSchema.nodeFromJSON(value ?? createEmptyDocJson())
	return EditorState.create({ schema: editorSchema, doc, plugins })
}

export class EditorCore {
	private readonly view: EditorView
	private readonly historyPlugin = history()
	private readonly onChange?: (value: DocJson) => void
	private keybindings?: Keybindings

	constructor(options: EditorCoreOptions) {
		this.onChange = options.onChange
		this.keybindings = options.keybindings
		this.view = new EditorView(options.mount, {
			state: createEditorState(options.initialValue, this.plugins()),
			attributes: { class: 'mded' },
			dispatchTransaction: (transaction) => this.dispatch(transaction),
		})
	}

	private plugins() {
		return createEditorPlugins(this.historyPlugin, this.keybindings)
	}

	getValue(): DocJson {
		return this.view.state.doc.toJSON() as DocJson
	}

	setValue(value: DocJson) {
		this.view.updateState(createEditorState(value, this.plugins()))
	}

	setKeybindings(keybindings?: Keybindings) {
		this.keybindings = keybindings
		this.view.updateState(this.view.state.reconfigure({ plugins: this.plugins() }))
	}

	focus() {
		this.view.focus()
	}

	destroy() {
		this.view.destroy()
	}

	private dispatch(transaction: Transaction) {
		const next = this.view.state.apply(transaction)
		this.view.updateState(next)
		if (transaction.docChanged) this.onChange?.(this.getValue())
	}
}
