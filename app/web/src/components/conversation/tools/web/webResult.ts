import { sourceDirective } from '../../../../ui/MarkdownView/plugins/source/remark.ts'

function record(value: unknown): Record<string, unknown> | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
	return value as Record<string, unknown>
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : ''
}

export function argumentUrls(args: Record<string, unknown> | null): string[] {
	const many = args?.urls
	if (Array.isArray(many)) {
		const urls = many.map(text).filter(Boolean)
		if (urls.length > 0) return urls
	}
	const one = text(args?.url)
	return one ? [one] : []
}

export type SearchSite = { name: string; url: string }

const SOURCE_LINE = /^Source:\s*(.+?)\s*\((https?:\/\/[^)]+)\)\s*$/
const NUMBERED_TITLE = /^\d+\.\s+(.+)$/
const QUERY_HEAD = /^##\s+Query:/
const PROVIDER_LINE = /^\*\*Providers? used:\*\*|^\*\*Provider:\*\*/
const SOURCES_HEAD = /^\*\*Sources:\*\*/
const GUIDANCE = /responseId|get_search_content|Content fetching in background|Full search results are stored|Full content for |Output truncated/
const PROGRESS = /^(Searching ".+" \(\d+\/\d+ complete\)\.\.\.|Completed \d+\/\d+ searches\.)$/

/** 参数里的关键词。多条 `queries` 优先，否则用单个 `query`。 */
export function searchKeywords(args: Record<string, unknown> | null): string[] {
	const queries = Array.isArray(args?.queries) ? args.queries.map(text).filter(Boolean) : []
	if (queries.length > 0) return queries
	const query = text(args?.query)
	return query ? [query] : []
}

function fenceMarker(line: string): { char: string; len: number } | null {
	const marker = line.match(/^(`{3,}|~{3,})/)?.[1]
	if (!marker) return null
	return { char: marker[0] ?? '`', len: marker.length }
}

function pushRule(kept: string[]) {
	while (kept.length > 0 && kept[kept.length - 1]?.trim() === '') kept.pop()
	kept.push('', '---', '')
}

/**
 * 留下要渲染的 Markdown。`Providers`、`Query`、编号清单和文末取回指引丢掉。
 * 围栏里的空行和 `Source:` 原样保留。段尾的 `Source: 名称 (url)` 换成行内指令。
 * 每一条结果开头单独的 `#` 去掉，当成普通文本。下一条结果前插入 `---`。
 */
export function parseSearchDocument(resultText: string): { sites: SearchSite[]; markdown: string } {
	const sites: SearchSite[] = []
	const kept: string[] = []
	let inSources = false
	let pendingTitle = ''
	let fence: { char: string; len: number } | null = null
	let atBreak = true
	let needRule = false

	const beginBlock = () => {
		if (needRule) pushRule(kept)
		needRule = false
		atBreak = false
	}

	for (const raw of resultText.split('\n')) {
		const line = raw.trim()
		const marker = fenceMarker(line)
		if (marker) {
			if (!fence) {
				if (!inSources) beginBlock()
				fence = marker
			} else if (marker.char === fence.char && marker.len >= fence.len) fence = null
			if (!inSources) kept.push(raw.trimEnd())
			continue
		}
		if (fence) {
			if (!inSources) kept.push(raw.trimEnd())
			continue
		}
		if (QUERY_HEAD.test(line) || PROVIDER_LINE.test(line) || GUIDANCE.test(line) || PROGRESS.test(line) || line === '---') {
			inSources = false
			pendingTitle = ''
			continue
		}
		if (SOURCES_HEAD.test(line)) {
			inSources = true
			pendingTitle = ''
			continue
		}
		if (inSources) {
			const title = line.match(NUMBERED_TITLE)?.[1]?.trim() ?? ''
			if (title) {
				pendingTitle = title
				continue
			}
			if (pendingTitle && /^https?:\/\//.test(line)) {
				sites.push({ name: pendingTitle, url: line })
				pendingTitle = ''
			}
			continue
		}
		const source = line.match(SOURCE_LINE)
		if (source) {
			kept.push(sourceDirective(source[1]?.trim() ?? '', source[2] ?? ''))
			atBreak = true
			needRule = true
			continue
		}
		if (line === '') {
			if (!atBreak) kept.push('')
			continue
		}
		let next = raw.trimEnd()
		if (atBreak) {
			beginBlock()
			next = next.replace(/^#(?!#)\s+/, '')
		}
		kept.push(next)
	}
	return { sites, markdown: kept.join('\n').trim() }
}

/** 短描述：标题，否则 URL，否则查询词，否则 responseId 前 8 位。 */
export function archiveDesc(args: Record<string, unknown> | null, details: unknown): { desc: string; url: string } {
	const data = record(details)
	const title = text(data?.title)
	const url = text(args?.url) || text(data?.url)
	const query = text(args?.query) || text(data?.query)
	const responseId = text(args?.responseId) || text(data?.responseId)
	return { desc: title || url || query || responseId.slice(0, 8), url }
}
