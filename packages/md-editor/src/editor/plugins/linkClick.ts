import { Plugin } from 'prosemirror-state'
import type { MdEditorMode } from './keymap.ts'

const openable = /^(https?:|mailto:)/i

export function linkClickPlugin(mode: MdEditorMode) {
	return new Plugin({
		props: {
			handleDOMEvents: {
				mousedown(_view, event) {
					if (!linkHref(event.target) || !shouldOpen(mode, event)) return false
					event.preventDefault()
					return true
				},
				click(_view, event) {
					const href = linkHref(event.target)
					if (!href || !shouldOpen(mode, event)) return false
					event.preventDefault()
					openLink(href)
					return true
				},
			},
		},
	})
}

function shouldOpen(mode: MdEditorMode, event: MouseEvent) {
	return mode === 'read' || ((event.metaKey || event.ctrlKey) && event.shiftKey)
}

function linkHref(target: EventTarget | null) {
	if (!(target instanceof Element)) return null
	const href = target.closest('a[href]')?.getAttribute('href')
	if (!href || !openable.test(href)) return null
	return href
}

function openLink(href: string) {
	const opened = window.open(href, '_blank')
	if (opened) opened.opener = null
}
