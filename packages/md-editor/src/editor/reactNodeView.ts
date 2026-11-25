import { createElement, createContext, useContext, type ComponentType, type HTMLAttributes, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { Mark, type MarkType, type Node as ProseMirrorNode } from 'prosemirror-model'
import { NodeSelection } from 'prosemirror-state'
import { type Decoration, type DecorationSource, type EditorView, type MarkView, type NodeView, type ViewMutationRecord } from 'prosemirror-view'

const ReactNodeViewContentContext = createContext<HTMLElement | null>(null)

export type ReactNodeViewProps = {
	node: ProseMirrorNode
	view: EditorView
	getPos: () => number | undefined
	decorations: readonly Decoration[]
	selected: boolean
	updateAttributes: (attrs: Record<string, unknown>) => void
	deleteNode: () => void
}

export type ReactMarkViewProps = {
	mark: Mark
	view: EditorView
	inline: boolean
	updateAttributes: (attrs: Record<string, unknown>) => void
}

export type ReactNodeViewOptions = {
	content?: boolean
	domElementTag?: keyof HTMLElementTagNameMap
	contentDOMElementTag?: keyof HTMLElementTagNameMap
}

export type NodeViewContentProps = HTMLAttributes<HTMLElement> & {
	as?: 'div' | 'span'
}

const passThroughEvents = new Set(['dragstart', 'drag', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop', 'copy', 'paste', 'cut'])

function stopReactViewEvent(event: Event, contentDOM: HTMLElement | null) {
	const target = event.target
	if (!(target instanceof Element)) return false
	if (contentDOM?.contains(target)) return false
	if (passThroughEvents.has(event.type)) return false
	return Boolean(target.closest('[data-node-view-stop-event="true"], button, input, select, textarea'))
}

function ignoreReactViewMutation(mutation: ViewMutationRecord, contentDOM: HTMLElement | null) {
	if (mutation.type === 'selection') return false
	if (!contentDOM) return true
	if (mutation.target === contentDOM) return mutation.type === 'attributes'
	if (contentDOM.contains(mutation.target)) return false
	return true
}

function syncContentAttributes(contentDOM: HTMLElement, className: string | undefined, props: HTMLAttributes<HTMLElement>) {
	if (className != null && contentDOM.className !== className) contentDOM.className = className
	for (const [key, value] of Object.entries(props)) {
		if (!key.startsWith('data-') && !key.startsWith('aria-')) continue
		if (value == null || value === false) {
			contentDOM.removeAttribute(key)
			continue
		}
		const next = String(value)
		if (contentDOM.getAttribute(key) !== next) contentDOM.setAttribute(key, next)
	}
}

export function NodeViewContent({ as = 'div', className, children: _children, ...rest }: NodeViewContentProps) {
	const contentDOM = useContext(ReactNodeViewContentContext)
	return createElement(as, {
		...rest,
		'data-node-view-content': '',
		ref: (element: HTMLElement | null) => {
			if (!element || !contentDOM) return
			syncContentAttributes(contentDOM, className, rest)
			if (element.firstChild !== contentDOM) element.insertBefore(contentDOM, element.firstChild)
		},
	})
}

function renderView(root: Root, contentDOM: HTMLElement | null, node: ReactNode) {
	flushSync(() => {
		root.render(createElement(ReactNodeViewContentContext.Provider, { value: contentDOM }, node))
	})
}

function attachContent(dom: HTMLElement, contentDOM: HTMLElement | null) {
	if (!contentDOM) return
	const slot = dom.querySelector('[data-node-view-content]')
	if (slot) {
		if (slot.firstChild !== contentDOM) slot.insertBefore(contentDOM, slot.firstChild)
		return
	}
	if (!dom.contains(contentDOM)) dom.appendChild(contentDOM)
}

function rangeOfMark(doc: ProseMirrorNode, pos: number, type: MarkType) {
	const clamped = Math.max(0, Math.min(pos, doc.content.size))
	const $pos = doc.resolve(clamped)
	const mark = $pos.marks().find((item) => item.type === type) ?? $pos.nodeAfter?.marks.find((item) => item.type === type)
	if (!mark) return null
	const parent = $pos.parent
	let index = $pos.index()
	const current = parent.child(index)
	if (!current?.marks.some((item) => item.eq(mark))) {
		if (index > 0 && parent.child(index - 1)?.marks.some((item) => item.eq(mark))) index -= 1
		else return null
	}
	let start = index
	let end = index + 1
	while (start > 0 && parent.child(start - 1)?.marks.some((item) => item.eq(mark))) start -= 1
	while (end < parent.childCount && mark.isInSet(parent.child(end)?.marks ?? Mark.none)) end += 1
	let from = $pos.start()
	for (let i = 0; i < start; i++) from += parent.child(i)?.nodeSize ?? 0
	let to = from
	for (let i = start; i < end; i++) to += parent.child(i)?.nodeSize ?? 0
	return { from, to, mark }
}

class ReactNodeView implements NodeView {
	dom: HTMLElement
	contentDOM?: HTMLElement

	private node: ProseMirrorNode
	private decorations: readonly Decoration[]
	private selected = false
	private destroyed = false
	private readonly root: Root
	private readonly view: EditorView
	private readonly getPos: () => number | undefined
	private readonly Component: ComponentType<ReactNodeViewProps>

	constructor(
		Component: ComponentType<ReactNodeViewProps>,
		node: ProseMirrorNode,
		view: EditorView,
		getPos: () => number | undefined,
		decorations: readonly Decoration[],
		options: ReactNodeViewOptions,
	) {
		this.Component = Component
		this.node = node
		this.view = view
		this.getPos = getPos
		this.decorations = decorations
		this.dom = document.createElement(options.domElementTag ?? 'div')
		if (options.content !== false) this.contentDOM = document.createElement(options.contentDOMElementTag ?? 'div')
		this.root = createRoot(this.dom)
		this.render()
	}

	update(node: ProseMirrorNode, decorations: readonly Decoration[], _innerDecorations: DecorationSource) {
		if (node.type !== this.node.type) return false
		const unchanged = node === this.node && decorations === this.decorations
		this.node = node
		this.decorations = decorations
		if (!unchanged) this.render()
		return true
	}

	selectNode() {
		this.selected = true
		this.render()
	}

	deselectNode() {
		this.selected = false
		this.render()
	}

	stopEvent(event: Event) {
		return stopReactViewEvent(event, this.contentDOM ?? null)
	}

	ignoreMutation(mutation: ViewMutationRecord) {
		return ignoreReactViewMutation(mutation, this.contentDOM ?? null)
	}

	destroy() {
		if (this.destroyed) return
		this.destroyed = true
		const root = this.root
		queueMicrotask(() => {
			root.unmount()
		})
	}

	private render() {
		if (this.destroyed) return
		const props: ReactNodeViewProps = {
			node: this.node,
			view: this.view,
			getPos: this.getPos,
			decorations: this.decorations,
			selected: this.selected,
			updateAttributes: (attrs) => this.updateAttributes(attrs),
			deleteNode: () => this.deleteNode(),
		}
		renderView(this.root, this.contentDOM ?? null, createElement(this.Component, props))
		attachContent(this.dom, this.contentDOM ?? null)
	}

	private updateAttributes(attrs: Record<string, unknown>) {
		const pos = this.getPos()
		if (pos == null) return
		const node = this.view.state.doc.nodeAt(pos) ?? this.node
		this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }))
	}

	private deleteNode() {
		const pos = this.getPos()
		if (pos == null) return
		this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos)).deleteSelection())
	}
}

class ReactMarkViewHost implements MarkView {
	dom: HTMLElement
	contentDOM: HTMLElement

	private mark: Mark
	private destroyed = false
	private readonly root: Root
	private readonly view: EditorView
	private readonly inline: boolean
	private readonly Component: ComponentType<ReactMarkViewProps>

	constructor(Component: ComponentType<ReactMarkViewProps>, mark: Mark, view: EditorView, inline: boolean) {
		this.Component = Component
		this.mark = mark
		this.view = view
		this.inline = inline
		this.dom = document.createElement(inline ? 'span' : 'div')
		this.contentDOM = document.createElement(inline ? 'span' : 'div')
		this.root = createRoot(this.dom)
		this.render()
	}

	update(mark: Mark) {
		if (mark.type !== this.mark.type) return false
		this.mark = mark
		this.render()
		return true
	}

	ignoreMutation(mutation: ViewMutationRecord) {
		return ignoreReactViewMutation(mutation, this.contentDOM)
	}

	destroy() {
		if (this.destroyed) return
		this.destroyed = true
		const root = this.root
		queueMicrotask(() => {
			root.unmount()
		})
	}

	private render() {
		if (this.destroyed) return
		const props: ReactMarkViewProps = {
			mark: this.mark,
			view: this.view,
			inline: this.inline,
			updateAttributes: (attrs) => this.updateAttributes(attrs),
		}
		renderView(this.root, this.contentDOM, createElement(this.Component, props))
		attachContent(this.dom, this.contentDOM)
	}

	private updateAttributes(attrs: Record<string, unknown>) {
		const pos = this.view.posAtDOM(this.contentDOM, 0)
		const found = rangeOfMark(this.view.state.doc, pos, this.mark.type)
		if (!found) return
		const next = found.mark.type.create({ ...found.mark.attrs, ...attrs })
		this.view.dispatch(this.view.state.tr.removeMark(found.from, found.to, found.mark.type).addMark(found.from, found.to, next))
	}
}

export function createReactNodeView(Component: ComponentType<ReactNodeViewProps>, options: ReactNodeViewOptions = {}) {
	return (
		node: ProseMirrorNode,
		view: EditorView,
		getPos: () => number | undefined,
		decorations: readonly Decoration[],
		_innerDecorations: DecorationSource,
	): NodeView => new ReactNodeView(Component, node, view, getPos, decorations, options)
}

export function createReactMarkView(Component: ComponentType<ReactMarkViewProps>) {
	return (mark: Mark, view: EditorView, inline: boolean): MarkView => new ReactMarkViewHost(Component, mark, view, inline)
}
