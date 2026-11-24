import { baseKeymap } from 'prosemirror-commands'
import { redo, undo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { type Command, type Plugin } from 'prosemirror-state'
import { placeholderPlugin } from './placeholder.ts'

export type EditorCommand = 'undo' | 'redo'

export type Keybindings = Partial<Record<EditorCommand, readonly string[]>>

const defaultKeys: Record<EditorCommand, readonly string[]> = {
	undo: ['Mod-z'],
	redo: ['Mod-Shift-z', 'Mod-y'],
}

const commands: Record<EditorCommand, Command> = { undo, redo }

export function commandBindings(keybindings?: Keybindings): Record<string, Command> {
	const bindings: Record<string, Command> = {}
	for (const id of ['undo', 'redo'] as const) {
		for (const key of keybindings?.[id] ?? defaultKeys[id]) bindings[key] = commands[id]
	}
	return bindings
}

export function createEditorPlugins(historyPlugin: Plugin, keybindings?: Keybindings): Plugin[] {
	return [historyPlugin, keymap(commandBindings(keybindings)), keymap(baseKeymap), placeholderPlugin]
}
