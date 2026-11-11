/** 工具对空目录返回的固定文案。 */
const EMPTY_TEXT = '(empty directory)'

export type LsListing = {
	/** 目录项，按工具给的顺序。目录带 '/' 后缀，文件不带。 */
	entries: string[]
	/** 工具追加在结果末尾的截断提示原文（去掉外层方括号）。没有则空串。 */
	notice: string
}

/**
 * 从 ls 的结果文本里取出目录项和截断提示。
 *
 * 结果文本 = 条目按行拼 + 可选的 `\n\n[提示]`。提示不是条目，算数量前要先剥掉。
 */
export function parseLsListing(resultText: string): LsListing {
	const text = resultText.trim()
	if (!text) return { entries: [], notice: '' }

	const noticeAt = text.lastIndexOf('\n\n[')
	const hasNotice = noticeAt >= 0 && text.endsWith(']')
	const body = hasNotice ? text.slice(0, noticeAt) : text
	const notice = hasNotice ? text.slice(noticeAt + 3, -1) : ''

	if (body === EMPTY_TEXT) return { entries: [], notice: '' }
	return { entries: body.split('\n').filter((line) => line !== ''), notice }
}

/**
 * 目录项的计数描述。目录带 '/' 后缀。
 *
 * 为 0 的那类不写出来，空目录得到空串。
 */
export function describeLsEntries(entries: string[]): string {
	const folders = entries.filter((entry) => entry.endsWith('/')).length
	const files = entries.length - folders
	const parts: string[] = []
	if (files > 0) parts.push(`${files} 个文件`)
	if (folders > 0) parts.push(`${folders} 个文件夹`)
	return parts.join('，')
}
