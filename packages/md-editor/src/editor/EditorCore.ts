import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { createEmptyDocJson } from './json'
import { editorSchema } from './schema'
import type { DocJson } from './types'

export type EditorCoreOptions = {
	mount: HTMLElement
	initialValue?: DocJson
}

export class EditorCore {
	private readonly view: EditorView

	constructor(options: EditorCoreOptions) {
		const doc = editorSchema.nodeFromJSON(options.initialValue ?? createEmptyDocJson())
		this.view = new EditorView(options.mount, {
			state: EditorState.create({ schema: editorSchema, doc }),
		})
	}

	getValue(): DocJson {
		return this.view.state.doc.toJSON() as DocJson
	}

	setValue(value: DocJson) {
		const doc = editorSchema.nodeFromJSON(value)
		this.view.updateState(EditorState.create({ schema: editorSchema, doc }))
	}

	focus() {
		this.view.focus()
	}

	destroy() {
		this.view.destroy()
	}
}
