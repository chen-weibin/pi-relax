import MarkdownIt, { type Token } from 'markdown-it'
import { editorSchema } from './schema.ts'
import type { BlockJson, DocJson, InlineJson, ListItemJson } from './types'

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
		if (depth === 0 && token.type === 'blockquote_open') {
			const close = closeAt(tokens, index, 'blockquote_open', 'blockquote_close')
			blocks.push(blockquoteBlock(parseBlocks(tokens.slice(index + 1, close))))
			index = close + 1
			continue
		}
		if (depth === 0 && (token.type === 'bullet_list_open' || token.type === 'ordered_list_open')) {
			const ordered = token.type === 'ordered_list_open'
			const close = closeAt(tokens, index, token.type, ordered ? 'ordered_list_close' : 'bullet_list_close')
			const items = parseListItems(tokens.slice(index + 1, close))
			const first = items[0]
			if (first) {
				const content: [ListItemJson, ...ListItemJson[]] = [first, ...items.slice(1)]
				blocks.push(ordered ? orderedListBlock(token, content) : { type: 'bullet_list', content })
			}
			index = close + 1
			continue
		}
		if (depth === 0 && token.type === 'hr') {
			blocks.push({ type: 'horizontal_rule' })
			index += 1
			continue
		}
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

function parseListItems(tokens: Token[]) {
	const items: ListItemJson[] = []
	let index = 0
	while (index < tokens.length) {
		const token = tokens[index]
		if (!token) break
		if (token.type !== 'list_item_open') {
			index += 1
			continue
		}
		const close = closeAt(tokens, index, 'list_item_open', 'list_item_close')
		items.push(listItemBlock(parseBlocks(tokens.slice(index + 1, close))))
		index = close + 1
	}
	return items
}

function listItemBlock(inner: BlockJson[]): ListItemJson {
	const first = inner[0]
	if (first?.type === 'paragraph') return { type: 'list_item', content: [first, ...inner.slice(1)] }
	return { type: 'list_item', content: [{ type: 'paragraph' }, ...inner] }
}

function orderedListBlock(open: Token, content: [ListItemJson, ...ListItemJson[]]): BlockJson {
	const raw = Number(open.attrGet('start') ?? 1)
	const order = Number.isInteger(raw) && raw >= 1 ? raw : 1
	return { type: 'ordered_list', attrs: { order }, content }
}

function blockquoteBlock(inner: BlockJson[]): BlockJson {
	const first = inner[0]
	if (!first) return { type: 'blockquote', content: [{ type: 'paragraph' }] }
	return { type: 'blockquote', content: [first, ...inner.slice(1)] }
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

function serializeBlock(block: BlockJson): string {
	if (block.type === 'blockquote') {
		return block.content
			.map(serializeBlock)
			.join('\n\n')
			.split('\n')
			.map((line) => `> ${line}`)
			.join('\n')
	}
	if (block.type === 'horizontal_rule') return '---'
	if (block.type === 'bullet_list') return serializeList(block.content, null)
	if (block.type === 'ordered_list') return serializeList(block.content, block.attrs.order)
	const text = block.content?.map((node) => node.text).join('') ?? ''
	if (block.type === 'heading') return `${'#'.repeat(block.attrs.level)} ${text}`
	return text
}

function serializeList(items: readonly ListItemJson[], start: number | null) {
	return items.map((item, index) => serializeListItem(item, start == null ? '- ' : `${start + index}. `)).join('\n')
}

function serializeListItem(item: ListItemJson, marker: string) {
	const pad = ' '.repeat(marker.length)
	const lines: string[] = []
	item.content.forEach((block, index) => {
		const blockLines = serializeBlock(block).split('\n')
		if (index === 0) {
			lines.push(`${marker}${blockLines[0] ?? ''}`)
			for (const line of blockLines.slice(1)) lines.push(`${pad}${line}`)
			return
		}
		const nested = block.type === 'bullet_list' || block.type === 'ordered_list'
		if (!nested) lines.push('')
		for (const line of blockLines) lines.push(`${pad}${line}`)
	})
	return lines.join('\n')
}
