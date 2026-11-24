import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const placeholderPlugin = new Plugin({
	props: {
		decorations(state) {
			const first = state.doc.firstChild
			if (state.doc.childCount !== 1 || first?.type.name !== 'paragraph' || first.content.size !== 0) return null
			return DecorationSet.create(state.doc, [
				Decoration.node(0, first.nodeSize, { class: 'mded-empty' }),
			])
		},
	},
})
