import MarkdownIt, { type Token } from 'markdown-it'
import { editorSchema } from './schema.ts'
import type { BlockJson, DocJson, InlineJson } from './types'

const md = new MarkdownIt({ html: false, linkify: false, typographer: false })

export function createEmptyDocJson(): DocJson {
	return editorSchema.nodes.doc.create(null, editorSchema.nodes.paragraph.create()).toJSON() as DocJson
}

export function markdownToDocJson(markdown: string): DocJson {
	const blocks = markdown ? parseBlocks(md.parse(markdown, {})) : []
	const json = blocks.length > 0 ? { type: 'doc', content: blocks } : createEmptyDocJson()
	return editorSchema.nodeFromJSON(json).toJSON() as DocJson
}

export function docJsonToMarkdown(doc: DocJson): string {
	return doc.content.map(serializeBlock).join('\n\n')
}

function parseBlocks(tokens: Token[]): BlockJson[] {
	const blocks: BlockJson[] = []
	let depth = 0
	let index = 0

	while (index < tokens.length) {
		const token = tokens[index]
		if (!token) break
		if (depth === 0 && (token.type === 'heading_open' || token.type === 'paragraph_open')) {
			const close = token.type === 'heading_open' ? 'heading_close' : 'paragraph_close'
			const inline = tokens[index + 1]
			const block = token.type === 'heading_open' ? headingBlock(token, inline) : paragraphBlock(inline)
			if (block) blocks.push(block)
			index = closeAt(tokens, index, token.type, close) + 1
			continue
		}
		if (token.nesting > 0) depth += 1
		else if (token.nesting < 0) depth -= 1
		index += 1
	}

	return blocks
}

function headingBlock(open: Token, inline: Token | undefined): BlockJson | null {
	const level = Number(open.tag.slice(1))
	if (level < 1 || level > 6) return null
	const content = inlineText(inline)
	const block: BlockJson = { type: 'heading', attrs: { level } }
	if (content.length > 0) block.content = content
	return block
}

function paragraphBlock(inline: Token | undefined): BlockJson {
	const content = inlineText(inline)
	const block: BlockJson = { type: 'paragraph' }
	if (content.length > 0) block.content = content
	return block
}

function inlineText(token: Token | undefined): InlineJson[] {
	if (!token || token.type !== 'inline') return []
	let text = ''
	for (const child of token.children ?? []) {
		if (child.type === 'text') text += child.content
	}
	return text ? [{ type: 'text', text }] : []
}

function closeAt(tokens: Token[], start: number, open: string, close: string) {
	let depth = 0
	for (let index = start; index < tokens.length; index += 1) {
		const token = tokens[index]
		if (!token) break
		if (token.type === open) depth += 1
		else if (token.type === close) {
			depth -= 1
			if (depth === 0) return index
		}
	}
	return tokens.length - 1
}

function serializeBlock(block: BlockJson) {
	const text = block.content?.map((node) => node.text).join('') ?? ''
	if (block.type === 'heading') return `${'#'.repeat(block.attrs.level)} ${text}`
	return text
}
