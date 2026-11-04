export function formatToolArguments(value: unknown, argumentsError?: unknown): string {
	if (typeof argumentsError === 'string' && argumentsError !== '') return argumentsError
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		if (value == null) return ''
		try {
			return JSON.stringify(value, null, 2)
		} catch {
			return ''
		}
	}
	if (Object.keys(value).length === 0) return ''
	try {
		return JSON.stringify(value, null, 2)
	} catch {
		return ''
	}
}

/** 工具结果里的 text 拼起来。图片先跳过。 */
export function toolResultText(result: unknown): string {
	if (typeof result === 'string') return result
	const content = Array.isArray(result)
		? result
		: result && typeof result === 'object' && 'content' in result
			? (result as { content?: unknown }).content
			: undefined
	if (typeof content === 'string') return content
	if (!Array.isArray(content)) return ''
	let text = ''
	for (const part of content) {
		if (typeof part !== 'object' || part === null) continue
		const item = part as { type?: unknown; text?: unknown }
		if (item.type === 'text' && typeof item.text === 'string') text += item.text
	}
	return text
}
