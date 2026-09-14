import { Plugin } from 'prosemirror-state'
import { isDocEmpty } from './serialize'

/** Toggle `is-editor-empty` + `data-placeholder` on the editor DOM for CSS ::before. */
export function placeholderPlugin(getPlaceholder: () => string): Plugin {
	return new Plugin({
		view(view) {
			const sync = () => {
				const empty = isDocEmpty(view.state.doc)
				view.dom.classList.toggle('is-editor-empty', empty)
				if (empty) {
					view.dom.setAttribute('data-placeholder', getPlaceholder())
				} else {
					view.dom.removeAttribute('data-placeholder')
				}
			}
			sync()
			return {
				update() {
					sync()
				},
			}
		},
	})
}
