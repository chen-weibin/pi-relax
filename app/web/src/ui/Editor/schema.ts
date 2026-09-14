import { Schema } from 'prosemirror-model'

/** Minimal schema: doc → paragraph+ → text* */
export const schema = new Schema({
	nodes: {
		doc: {
			content: 'paragraph+',
		},
		paragraph: {
			content: 'text*',
			group: 'block',
			parseDOM: [{ tag: 'p' }],
			toDOM() {
				return ['p', 0]
			},
		},
		text: {
			group: 'inline',
		},
	},
})
