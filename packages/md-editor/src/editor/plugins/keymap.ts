import { baseKeymap, chainCommands, setBlockType, toggleMark } from 'prosemirror-commands'
import { redo, undo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { liftListItem, sinkListItem, splitListItem, wrapInList } from 'prosemirror-schema-list'
import { type Command, type Plugin } from 'prosemirror-state'
import { editorSchema } from '../schema.ts'
import { blockInputRules, horizontalRuleOnEnter, linkSyntaxPlugin } from './inputRules.ts'
import { linkClickPlugin } from './linkClick.ts'
import { placeholderPlugin } from './placeholder.ts'
import { taskListPlugin } from './taskList.ts'

export type MdEditorMode = 'edit' | 'read'

export type EditorCommand =
	| 'undo'
	| 'redo'
	| 'paragraph'
	| 'heading1'
	| 'heading2'
	| 'heading3'
	| 'heading4'
	| 'heading5'
	| 'heading6'
	| 'bulletList'
	| 'orderedList'
	| 'sinkListItem'
	| 'liftListItem'
	| 'bold'
	| 'italic'
	| 'code'
	| 'strike'
	| 'link'

export type Keybindings = Partial<Record<EditorCommand, readonly string[]>>

const { paragraph, heading, bullet_list, ordered_list, list_item, task_item } = editorSchema.nodes
const { strong, em, code, strike, link } = editorSchema.marks

export const enterCommand = chainCommands(
	horizontalRuleOnEnter,
	splitListItem(task_item, { checked: false }),
	splitListItem(list_item),
)

const defaultKeys: Record<EditorCommand, readonly string[]> = {
	undo: ['Mod-z'],
	redo: ['Mod-Shift-z', 'Mod-y'],
	paragraph: ['Mod-Alt-0'],
	heading1: ['Mod-Alt-1'],
	heading2: ['Mod-Alt-2'],
	heading3: ['Mod-Alt-3'],
	heading4: ['Mod-Alt-4'],
	heading5: ['Mod-Alt-5'],
	heading6: ['Mod-Alt-6'],
	bulletList: ['Mod-Shift-8'],
	orderedList: ['Mod-Shift-7'],
	sinkListItem: ['Tab'],
	liftListItem: ['Shift-Tab'],
	bold: ['Mod-b'],
	italic: ['Mod-i'],
	code: ['Mod-e'],
	strike: ['Mod-Shift-x'],
	link: ['Mod-k'],
}

const commands: Record<EditorCommand, Command> = {
	undo,
	redo,
	paragraph: setBlockType(paragraph),
	heading1: setBlockType(heading, { level: 1 }),
	heading2: setBlockType(heading, { level: 2 }),
	heading3: setBlockType(heading, { level: 3 }),
	heading4: setBlockType(heading, { level: 4 }),
	heading5: setBlockType(heading, { level: 5 }),
	heading6: setBlockType(heading, { level: 6 }),
	bulletList: wrapInList(bullet_list),
	orderedList: wrapInList(ordered_list),
	sinkListItem: sinkListItem(list_item),
	liftListItem: liftListItem(list_item),
	bold: toggleMark(strong),
	italic: toggleMark(em),
	code: toggleMark(code),
	strike: toggleMark(strike),
	link: toggleMark(link),
}

const commandIds = Object.keys(defaultKeys) as EditorCommand[]

export function commandBindings(keybindings?: Keybindings): Record<string, Command> {
	const bindings: Record<string, Command> = {}
	for (const id of commandIds) {
		for (const key of keybindings?.[id] ?? defaultKeys[id]) bindings[key] = commands[id]
	}
	return bindings
}

export function createEditorPlugins(
	historyPlugin: Plugin,
	keybindings?: Keybindings,
	mode: MdEditorMode = 'edit',
): Plugin[] {
	if (mode === 'read') return [placeholderPlugin, linkClickPlugin('read')]
	return [
		historyPlugin,
		blockInputRules,
		linkSyntaxPlugin,
		keymap(commandBindings(keybindings)),
		keymap({ Enter: enterCommand }),
		keymap(baseKeymap),
		placeholderPlugin,
		taskListPlugin,
		linkClickPlugin('edit'),
	]
}
