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

/**
 * `formatToolArguments` 的逆。参数是对象时才给值。
 *
 * 流式期的参数是半截 JSON，解析会失败。这种时候返回 null，调用方按「参数还没齐」处理。
 */
export function parseToolArguments(text: string): Record<string, unknown> | null {
	if (!text) return null
	let parsed: unknown
	try {
		parsed = JSON.parse(text)
	} catch {
		return null
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
	return parsed as Record<string, unknown>
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

/** 工具结果或 toolResult 消息上的 details。没有就不给。 */
export function toolResultDetails(result: unknown): unknown | undefined {
	if (typeof result !== 'object' || result === null || !('details' in result)) return undefined
	const details = (result as { details?: unknown }).details
	return details === undefined ? undefined : details
}

/** sameBlock 用：两边都没有算相等，有值就按 JSON 比。 */
export function sameToolDetails(a: unknown, b: unknown): boolean {
	if (a === undefined && b === undefined) return true
	if (a === undefined || b === undefined) return false
	if (Object.is(a, b)) return true
	try {
		return JSON.stringify(a) === JSON.stringify(b)
	} catch {
		return false
	}
}
