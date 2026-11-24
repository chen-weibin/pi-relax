import { history } from 'prosemirror-history'
import { EditorState, type Plugin, type Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { createEmptyDocJson } from './json.ts'
import { createEditorPlugins, type Keybindings, type MdEditorMode } from './plugins/keymap.ts'
import { editorSchema } from './schema.ts'
import type { DocJson } from './types'

export type EditorCoreOptions = {
	mount: HTMLElement
	initialValue?: DocJson
	onChange?: (value: DocJson) => void
	keybindings?: Keybindings
	mode?: MdEditorMode
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
	private mode: MdEditorMode

	constructor(options: EditorCoreOptions) {
		this.onChange = options.onChange
		this.keybindings = options.keybindings
		this.mode = options.mode ?? 'edit'
		this.view = new EditorView(options.mount, {
			state: createEditorState(options.initialValue, this.plugins()),
			attributes: { class: 'mded' },
			editable: () => this.mode === 'edit',
			dispatchTransaction: (transaction) => this.dispatch(transaction),
		})
	}

	private plugins() {
		return createEditorPlugins(this.historyPlugin, this.keybindings, this.mode)
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

	setMode(mode: MdEditorMode) {
		if (this.mode === mode) return
		this.mode = mode
		// 阅读态卸下 history 插件，撤销栈丢掉。切回编辑态同一实例会重新 init。
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
