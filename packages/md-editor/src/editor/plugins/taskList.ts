import { Plugin } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { editorSchema } from '../schema.ts'

const taskItem = editorSchema.nodes.task_item

export function isTaskCheckboxPoint({
	x,
	y,
	itemLeft,
	itemTop,
	fontSize,
}: {
	x: number
	y: number
	itemLeft: number
	itemTop: number
	fontSize: number
}) {
	const left = itemLeft - fontSize * 1.45
	// ponytail: 0.3 = (line-height 1.6 - box 1) / 2, left 1.45em. CSS variables are the same; a different size needs both updated.
	const top = itemTop + fontSize * 0.3
	const size = fontSize
	return x >= left && x <= left + size && y >= top && y <= top + size
}

export const taskListPlugin = new Plugin({
	props: {
		handleDOMEvents: {
			mousedown(view, event) {
				if (!taskElementAtCheckbox(view, event)) return false
				event.preventDefault()
				return true
			},
			click(view, event) {
				const item = taskElementAtCheckbox(view, event)
				if (!item) return false
				const match = taskNodeAtElement(view, item)
				if (!match) return false
				event.preventDefault()
				view.dispatch(
					view.state.tr.setNodeMarkup(match.pos, undefined, {
						checked: !match.node.attrs.checked,
					}),
				)
				return true
			},
		},
	},
})

function taskElementAtCheckbox(view: EditorView, event: MouseEvent) {
	const items = view.dom.querySelectorAll<HTMLElement>('li.mded-task')
	for (const item of items) {
		if (hitCheckbox(item, event)) return item
	}
	return null
}

function hitCheckbox(item: HTMLElement, event: MouseEvent) {
	const rect = item.getBoundingClientRect()
	const fontSize = Number.parseFloat(getComputedStyle(item).fontSize) || 16
	return isTaskCheckboxPoint({
		x: event.clientX,
		y: event.clientY,
		itemLeft: rect.left,
		itemTop: rect.top,
		fontSize,
	})
}

function taskNodeAtElement(view: EditorView, item: HTMLElement) {
	const pos = view.posAtDOM(item, 0)
	const $pos = view.state.doc.resolve(pos)
	for (let depth = $pos.depth; depth > 0; depth -= 1) {
		const node = $pos.node(depth)
		if (node.type === taskItem) return { node, pos: $pos.before(depth) }
	}
	return null
}
