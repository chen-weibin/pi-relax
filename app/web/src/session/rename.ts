/** 空白或与点编辑前相同则不改。返回要提交的标题。 */
export function nextSessionName(current: string, draft: string): string | null {
	const name = draft.trim()
	if (!name || name === current) return null
	return name
}
