declare module 'markdown-it' {
	export type Token = {
		type: string
		tag: string
		content: string
		nesting: number
		children: Token[] | null
	}

	export default class MarkdownIt {
		constructor(options?: { html?: boolean; linkify?: boolean; typographer?: boolean })
		parse(src: string, env: object): Token[]
	}
}
