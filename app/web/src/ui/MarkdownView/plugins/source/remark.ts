import remarkDirective from 'remark-directive'

type MdNode = {
	type: string
	name?: string
	value?: string
	attributes?: Record<string, string | null | undefined>
	children?: MdNode[]
	data?: { hName?: string; hProperties?: Record<string, string> }
}

const DIRECTIVES = new Set(['textDirective', 'leafDirective', 'containerDirective'])

/** remark-directive 的行内形式。标签里的 `\`、`[`、`]` 按该语法转义。 */
export function sourceDirective(name: string, url: string): string {
	const label = name.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('\n', ' ')
	const href = url.replaceAll('"', '%22')
	return `:source[${label}]{url="${href}"}`
}

function plainText(node: MdNode): string {
	if (typeof node.value === 'string') return node.value
	return (node.children ?? []).map(plainText).join('')
}

function asChip(node: MdNode): boolean {
	if (node.type !== 'textDirective' && node.type !== 'leafDirective') return false
	if (node.name !== 'source') return false
	const url = node.attributes?.url ?? ''
	if (!/^https?:\/\//.test(url)) return false
	const name = plainText(node).trim() || url
	node.children = []
	node.data = { hName: 'source-chip', hProperties: { name, site: url } }
	return true
}

function formatAttrs(attributes: MdNode['attributes']): string {
	if (!attributes) return ''
	const parts = Object.entries(attributes).flatMap(([key, value]) => {
		if (!value) return [key]
		return [`${key}="${value.replaceAll('"', '%22')}"`]
	})
	return parts.length > 0 ? `{${parts.join(' ')}}` : ''
}

/** 没接成来源标记的指令还原成字面量，避免 `:单词` 从正文里消失。 */
function literal(node: MdNode): MdNode[] {
	const marks = node.type === 'containerDirective' ? ':::' : node.type === 'leafDirective' ? '::' : ':'
	const label = node.type === 'containerDirective' ? '' : plainText(node)
	const text = `${marks}${node.name ?? ''}${label ? `[${label}]` : ''}${formatAttrs(node.attributes)}`
	if (node.type === 'textDirective') return [{ type: 'text', value: text }]
	const blocks = node.type === 'containerDirective' ? (node.children ?? []) : []
	return [{ type: 'paragraph', children: [{ type: 'text', value: text }] }, ...blocks]
}

function walk(node: MdNode) {
	const children = node.children
	if (!children) return
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (!child) continue
		if (DIRECTIVES.has(child.type)) {
			if (asChip(child)) continue
			const inner = literal(child)
			children.splice(i, 1, ...inner)
			i -= 1
			continue
		}
		walk(child)
	}
}

/** 把 `:source[名称]{url="..."}` 画成来源标记。其它指令还原成原来的字面量。 */
export function remarkSourceChip() {
	return (tree: MdNode) => {
		walk(tree)
	}
}

export const sourceRemarkPlugins = [remarkDirective, remarkSourceChip]
