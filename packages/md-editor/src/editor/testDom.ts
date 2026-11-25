// ponytail: node:test 没有 DOM。这层只实现本测试会碰到的 createElement / classList / querySelector，没有布局和真实选区。
class NodeBase {
	childNodes: DomNode[] = []
	parentNode: DomNode | null = null
	nodeType = 0
	nodeName = ''
	ownerDocument: TestDocument | null = null

	get textContent() {
		return ''
	}

	set textContent(_value: string) {}

	removeChild<T extends DomNode>(node: T) {
		const index = this.childNodes.indexOf(node)
		if (index >= 0) this.childNodes.splice(index, 1)
		node.parentNode = null
		return node
	}

	get lastChild(): DomNode | null {
		return this.childNodes[this.childNodes.length - 1] ?? null
	}

	get nextSibling(): DomNode | null {
		const parent = this.parentNode
		if (!parent) return null
		const index = parent.childNodes.indexOf(this)
		if (index < 0) return null
		return parent.childNodes[index + 1] ?? null
	}

	get previousSibling(): DomNode | null {
		const parent = this.parentNode
		if (!parent) return null
		const index = parent.childNodes.indexOf(this)
		if (index <= 0) return null
		return parent.childNodes[index - 1] ?? null
	}
}

class ElementBase extends NodeBase {
	override nodeType = 1
}

class TextNode extends NodeBase {
	override nodeType = 3
	override nodeName = '#text'
	nodeValue: string

	constructor(text: string) {
		super()
		this.nodeValue = String(text)
	}

	get data() {
		return this.nodeValue
	}

	set data(value: string) {
		this.nodeValue = String(value)
	}

	override get textContent() {
		return this.nodeValue
	}

	override set textContent(value: string) {
		this.nodeValue = String(value)
	}
}

type DomNode = ElementBase | TextNode | NodeBase

class HTMLElementBase extends ElementBase {
	tagName = 'DIV'
	attributes = new Map<string, string>()
	dataset: Record<string, string> = {}
	style = { setProperty() {}, removeProperty() {} }
	contentEditable = 'inherit'
	classList: { add: (token: string) => void; remove: (token: string) => void; contains: (token: string) => boolean; length: number }

	constructor() {
		super()
		const el = this
		this.classList = {
			add(token) {
				const cur = new Set(classes(el))
				cur.add(token)
				el.setAttribute('class', [...cur].join(' '))
			},
			remove(token) {
				const cur = new Set(classes(el))
				cur.delete(token)
				const next = [...cur].join(' ')
				if (next) el.setAttribute('class', next)
				else el.removeAttribute('class')
			},
			contains(token) {
				return classes(el).includes(token)
			},
			get length() {
				return classes(el).length
			},
		}
	}

	setAttribute(name: string, value: string) {
		this.attributes.set(name, String(value))
	}

	getAttribute(name: string) {
		return this.attributes.has(name) ? (this.attributes.get(name) ?? null) : null
	}

	hasAttribute(name: string) {
		return this.attributes.has(name)
	}

	removeAttribute(name: string) {
		this.attributes.delete(name)
	}

	addEventListener() {}

	removeEventListener() {}

	appendChild<T extends DomNode>(node: T) {
		node.parentNode?.removeChild?.(node)
		node.parentNode = this
		this.childNodes.push(node)
		return node
	}

	insertBefore<T extends DomNode>(node: T, ref: DomNode | null) {
		node.parentNode?.removeChild?.(node)
		node.parentNode = this
		const index = ref ? this.childNodes.indexOf(ref) : -1
		if (index < 0) this.childNodes.push(node)
		else this.childNodes.splice(index, 0, node)
		return node
	}

	contains(node: unknown): boolean {
		if (node === this) return true
		return this.childNodes.some((child) => child === node || (child instanceof HTMLElementBase && child.contains(node)))
	}

	matches(selector: string): boolean {
		if (selector.includes(',')) return selector.split(',').some((part) => this.matches(part.trim()))
		const attrAt = selector.indexOf('[')
		if (attrAt > 0) return this.nodeName === selector.slice(0, attrAt).toUpperCase() && this.matches(selector.slice(attrAt))
		if (selector.startsWith('.')) return classes(this).includes(selector.slice(1))
		if (selector.startsWith('[')) {
			const body = selector.slice(1, -1)
			const [name, raw] = body.split('=')
			if (!name) return false
			if (raw == null) return this.hasAttribute(name)
			return this.getAttribute(name) === raw.replace(/^"|"$/g, '')
		}
		return this.nodeName === selector.toUpperCase()
	}

	querySelector(selector: string): HTMLElementBase | null {
		for (const child of this.childNodes) {
			if (!(child instanceof HTMLElementBase)) continue
			if (child.matches(selector)) return child
			const found = child.querySelector(selector)
			if (found) return found
		}
		return null
	}

	closest(selector: string): HTMLElementBase | null {
		let current: DomNode | null = this
		while (current) {
			if (current instanceof HTMLElementBase && current.matches(selector)) return current
			current = current.parentNode
		}
		return null
	}

	getBoundingClientRect() {
		return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }
	}

	focus() {}

	get firstChild() {
		return this.childNodes[0] ?? null
	}

	get className() {
		return this.getAttribute('class') ?? ''
	}

	set className(value: string) {
		if (value) this.setAttribute('class', value)
		else this.removeAttribute('class')
	}

	override get textContent() {
		return this.childNodes.map((child) => child.textContent).join('')
	}

	override set textContent(value: string) {
		for (const child of this.childNodes) child.parentNode = null
		this.childNodes = []
		if (!value) return
		const text = new TextNode(value)
		text.ownerDocument = this.ownerDocument
		this.appendChild(text)
	}
}

class TestDocument {
	nodeType = 9
	activeElement: HTMLElementBase | null = null
	body: HTMLElementBase
	documentElement: HTMLElementBase
	defaultView = globalThis

	constructor() {
		this.body = this.createElement('body')
		this.documentElement = this.createElement('html')
	}

	createElement(tag: string) {
		const el = new HTMLElementBase()
		el.nodeName = String(tag).toUpperCase()
		el.tagName = el.nodeName
		el.ownerDocument = this
		return el
	}

	createElementNS(_namespace: string, tag: string) {
		return this.createElement(tag)
	}

	createTextNode(text: string) {
		const node = new TextNode(text)
		node.ownerDocument = this
		return node
	}

	createComment(text: string) {
		const node = new NodeBase()
		node.nodeType = 8
		node.nodeName = '#comment'
		node.textContent = String(text)
		return node
	}

	createDocumentFragment() {
		const fragment = new HTMLElementBase()
		fragment.nodeType = 11
		fragment.ownerDocument = this
		return fragment
	}

	createRange() {
		const empty = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }
		return {
			setStart() {},
			setEnd() {},
			collapse() {},
			selectNodeContents() {},
			getClientRects: () => [],
			getBoundingClientRect: () => empty,
		}
	}

	getSelection() {
		const range = this.createRange()
		return {
			anchorNode: null,
			focusNode: null,
			anchorOffset: 0,
			focusOffset: 0,
			rangeCount: 0,
			removeAllRanges() {},
			addRange() {},
			getRangeAt: () => range,
			collapse() {},
		}
	}

	elementFromPoint() {
		return null
	}

	addEventListener() {}

	removeEventListener() {}
}

function classes(element: HTMLElementBase) {
	return (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
}

let installed = false

export function installTestDom() {
	if (installed || typeof globalThis.document !== 'undefined') return
	installed = true
	const host = globalThis as unknown as Record<string, unknown>
	host.Node = NodeBase
	host.Element = ElementBase
	host.HTMLElement = HTMLElementBase
	host.HTMLIFrameElement = class HTMLIFrameElement extends HTMLElementBase {}
	host.SVGElement = class SVGElement extends ElementBase {}
	host.Text = TextNode
	host.Comment = class Comment extends NodeBase {}
	host.DocumentFragment = class DocumentFragment extends HTMLElementBase {}
	const document = new TestDocument()
	host.document = document
	host.window = globalThis
	host.getSelection = () => document.getSelection()
	host.getComputedStyle = () => ({ getPropertyValue: () => '', removeProperty() {} })
	host.innerHeight = 0
	host.innerWidth = 0
	host.MutationObserver = class {
		observe() {}
		disconnect() {}
		takeRecords() {
			return []
		}
	}
}
