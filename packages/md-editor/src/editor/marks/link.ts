import type { MarkSpec } from 'prosemirror-model'

export const link: MarkSpec = {
	attrs: { href: { default: '' } },
	inclusive: false,
	parseDOM: [
		{
			tag: 'a[href]',
			getAttrs(dom) {
				const href = dom instanceof HTMLElement ? dom.getAttribute('href') : null
				return { href: href ?? '' }
			},
		},
	],
	toDOM(mark) {
		return ['a', { href: mark.attrs.href }, 0]
	},
}

export type LinkMarkJson = {
	type: 'link'
	attrs: { href: string }
}
