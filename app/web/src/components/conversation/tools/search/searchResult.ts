/** find / grep 结果文本解析。先剥末尾 `\n\n[...]` 截断提示，再拆文件列表。 */

export type SearchFileItem = {
	/** 结果里的相对路径（点击 log / 去重 key）。 */
	path: string
	/** 文件名（basename，浮窗展示用）。 */
	name: string
	/** grep 按文件聚合的匹配行数；find 不设。 */
	matchCount?: number
}

export type SearchListing = {
	files: SearchFileItem[]
	/** 工具追加在结果末尾的截断提示原文（去掉外层方括号）。没有则空串。 */
	notice: string
}

const FIND_EMPTY = 'No files found matching pattern'
const GREP_EMPTY = 'No matches found'

/** 匹配行：`path:line: text`；上下文行：`path-line- text`（不计入匹配）。 */
const GREP_MATCH_LINE = /^(.+):(\d+): /

function basename(path: string): string {
	const parts = path.split('/')
	return parts[parts.length - 1] || path
}

function splitBodyAndNotice(resultText: string): { body: string; notice: string } {
	const text = resultText.trim()
	if (!text) return { body: '', notice: '' }
	const noticeAt = text.lastIndexOf('\n\n[')
	const hasNotice = noticeAt >= 0 && text.endsWith(']')
	if (!hasNotice) return { body: text, notice: '' }
	return {
		body: text.slice(0, noticeAt),
		notice: text.slice(noticeAt + 3, -1),
	}
}

/**
 * find：一行一条相对路径。空匹配原文 → 空列表。
 */
export function parseFindResult(resultText: string): SearchListing {
	const { body, notice } = splitBodyAndNotice(resultText)
	if (!body || body === FIND_EMPTY) return { files: [], notice }
	const files: SearchFileItem[] = []
	for (const line of body.split('\n')) {
		if (line === '') continue
		files.push({ path: line, name: basename(line) })
	}
	return { files, notice }
}

/**
 * grep：只统计 `path:line:` 匹配行，按文件首次出现顺序聚合。空匹配原文 → 空列表。
 */
export function parseGrepResult(resultText: string): SearchListing {
	const { body, notice } = splitBodyAndNotice(resultText)
	if (!body || body === GREP_EMPTY) return { files: [], notice }

	const order: string[] = []
	const counts = new Map<string, number>()
	for (const line of body.split('\n')) {
		const match = GREP_MATCH_LINE.exec(line)
		if (!match) continue
		const filePath = match[1]!
		if (!counts.has(filePath)) {
			order.push(filePath)
			counts.set(filePath, 0)
		}
		counts.set(filePath, (counts.get(filePath) ?? 0) + 1)
	}

	return {
		files: order.map((path) => ({
			path,
			name: basename(path),
			matchCount: counts.get(path) ?? 0,
		})),
		notice,
	}
}
