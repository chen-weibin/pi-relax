import { baseKeymap } from 'prosemirror-commands'
import { redo, undo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import type { Command } from 'prosemirror-state'
import { docToText } from './serialize'

export type SubmitHandler = (text: string) => void

/**
 * Spread `baseKeymap`, move its Enter (split / new paragraph) to Shift-Enter,
 * and make Enter call `onSubmit` (always consume the key).
 */
export function createEditorKeymap(getOnSubmit: () => SubmitHandler | undefined) {
	const baseEnter = baseKeymap.Enter
	if (!baseEnter) {
		throw new Error('baseKeymap.Enter is missing')
	}

	const submitEnter: Command = (state) => {
		const text = docToText(state.doc)
		if (text.trim()) {
			getOnSubmit()?.(text)
		}
		return true
	}

	return [
		keymap({
			'Mod-z': undo,
			'Mod-y': redo,
			'Shift-Mod-z': redo,
		}),
		keymap({
			...baseKeymap,
			'Shift-Enter': baseEnter,
			Enter: submitEnter,
		}),
	]
}
