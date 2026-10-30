import type { CompletedMessage, CompletedPart } from './types'

function record(value: unknown): Record<string, unknown> | null {
	if (typeof value !== 'object' || value === null) return null
	return value as Record<string, unknown>
}

export function messageKey(message: unknown, fallback: string): string {
	const item = record(message)
	if (!item) return fallback
	if (typeof item.id === 'string' && item.id) return item.id
	if (typeof item.timestamp === 'number') return `t${item.timestamp}`
	return fallback
}

export function userMessageText(content: unknown): string {
	if (typeof content === 'string') return content
	if (!Array.isArray(content)) return ''
	let text = ''
	for (const part of content) {
		const item = record(part)
		if (!item) continue
		if (item.type === 'image') {
			// 用户消息里的 image 这一版不进文本块。后面单独做块再画。
			continue
		}
		if (item.type === 'text' && typeof item.text === 'string') text += item.text
	}
	return text
}

function assistantParts(content: unknown, errorMessage: unknown): CompletedPart[] {
	const parts: CompletedPart[] = []
	if (Array.isArray(content)) {
		content.forEach((part, index) => {
			const item = record(part)
			if (!item) return
			if (item.type === 'thinking' && typeof item.thinking === 'string' && item.thinking !== '') {
				parts.push({ type: 'thinking', text: item.thinking, contentIndex: index })
				return
			}
			if (item.type === 'text' && typeof item.text === 'string' && item.text !== '') {
				parts.push({ type: 'text', text: item.text, contentIndex: index })
			}
		})
	}
	if (parts.length === 0 && typeof errorMessage === 'string' && errorMessage !== '') {
		parts.push({ type: 'text', text: errorMessage, contentIndex: 0 })
	}
	return parts
}

function one(message: unknown, id: string): CompletedMessage | null {
	const item = record(message)
	if (!item || typeof item.role !== 'string') return null
	if (item.role === 'user') {
		const text = userMessageText(item.content)
		if (text === '') return null
		return { role: 'user', id, text }
	}
	if (item.role === 'assistant') {
		const parts = assistantParts(item.content, item.errorMessage)
		if (parts.length === 0) return null
		return { role: 'assistant', id, parts }
	}
	return null
}

/** 把 history 的 messages 收成 runtime.replace 能用的已完成消息。有 id 或 timestamp 时用它，否则用输入下标。 */
export function historyToMessages(input: readonly unknown[]): CompletedMessage[] {
	const out: CompletedMessage[] = []
	input.forEach((message, index) => {
		const mapped = one(message, messageKey(message, `m${index}`))
		if (mapped) out.push(mapped)
	})
	return out
}
