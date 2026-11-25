import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { Schema } from 'prosemirror-model'
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { installTestDom } from './testDom.ts'
import type { ReactMarkViewProps } from './reactNodeView.ts'

installTestDom()

const schema = new Schema({
	nodes: {
		doc: { content: 'block+' },
		text: { group: 'inline' },
		paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0] },
		card: {
			content: 'paragraph+',
			group: 'block',
			attrs: { tone: { default: 'plain' } },
			toDOM: (node) => ['section', { 'data-tone': node.attrs.tone }, 0],
		},
	},
	marks: {
		chip: {
			attrs: { label: { default: 'a' } },
			toDOM: (mark) => ['span', { 'data-label': mark.attrs.label }, 0],
		},
	},
})

describe('react node view', () => {
	it('keeps the editable element and cursor when a node attribute changes', async () => {
		const { createReactNodeView, NodeViewContent } = await import('./reactNodeView.ts')
		const mount = document.createElement('div')
		const doc = schema.node('doc', null, [
			schema.node('card', { tone: 'plain' }, [schema.node('paragraph', null, [schema.text('inside')])]),
		])
		const view = new EditorView(mount, {
			state: EditorState.create({ schema, doc, selection: TextSelection.create(doc, 3) }),
			nodeViews: {
				card: createReactNodeView(({ node }) =>
					createElement(
						'section',
						{ className: 'card', 'data-tone': node.attrs.tone },
						createElement('button', { 'data-node-view-stop-event': 'true' }, 'tone'),
						createElement(NodeViewContent, { className: 'card-body' }),
					),
				),
			},
		})

		const slot = view.dom.querySelector('[data-node-view-content]')
		const contentDOM = slot?.firstChild
		assert.ok(contentDOM instanceof HTMLElement)
		assert.equal(contentDOM.className, 'card-body')
		assert.equal(contentDOM.textContent, 'inside')
		assert.equal(view.dom.querySelector('.card')?.getAttribute('data-tone'), 'plain')
		assert.equal(view.state.selection.head, 3)

		view.dispatch(view.state.tr.setNodeMarkup(0, undefined, { tone: 'info' }))

		assert.equal(slot?.firstChild, contentDOM)
		assert.equal(contentDOM.textContent, 'inside')
		assert.equal(view.dom.querySelector('.card')?.getAttribute('data-tone'), 'info')
		assert.equal(view.state.selection.head, 3)
		view.destroy()
		await new Promise<void>((resolve) => {
			queueMicrotask(() => resolve())
		})
	})

	it('wraps mark text in a react shell and updates that mark only', async () => {
		const { createReactMarkView, NodeViewContent } = await import('./reactNodeView.ts')
		let updateAttributes: ReactMarkViewProps['updateAttributes'] | undefined
		const mount = document.createElement('div')
		const chip = schema.marks.chip.create({ label: 'a' })
		const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hi', [chip])])])
		const view = new EditorView(mount, {
			state: EditorState.create({ schema, doc }),
			markViews: {
				chip: createReactMarkView((props) => {
					updateAttributes = props.updateAttributes
					return createElement('span', { className: 'chip', 'data-label': props.mark.attrs.label }, createElement(NodeViewContent, { as: 'span' }))
				}),
			},
		})

		const slot = view.dom.querySelector('[data-node-view-content]')
		const contentDOM = slot?.firstChild
		assert.ok(contentDOM instanceof HTMLElement)
		assert.equal(contentDOM.textContent, 'hi')
		assert.equal(view.dom.querySelector('.chip')?.getAttribute('data-label'), 'a')

		updateAttributes?.({ label: 'b' })

		assert.equal(slot?.firstChild, contentDOM)
		assert.equal(contentDOM.textContent, 'hi')
		assert.equal(view.dom.querySelector('.chip')?.getAttribute('data-label'), 'b')
		assert.equal(view.state.doc.textContent, 'hi')
		view.destroy()
		await new Promise<void>((resolve) => {
			queueMicrotask(() => resolve())
		})
	})
})
