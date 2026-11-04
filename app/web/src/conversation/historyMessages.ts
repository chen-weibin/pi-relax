import type { CompletedMessage, CompletedPart } from './types'
import { formatToolArguments, toolResultText } from './toolText.ts'

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

function assistantParts(content: unknown): CompletedPart[] {
	const parts: CompletedPart[] = []
	if (!Array.isArray(content)) return parts
	content.forEach((part, index) => {
		const item = record(part)
		if (!item) return
		if (item.type === 'thinking' && typeof item.thinking === 'string' && item.thinking !== '') {
			parts.push({ type: 'thinking', text: item.thinking, contentIndex: index })
			return
		}
		if (item.type === 'text' && typeof item.text === 'string' && item.text !== '') {
			parts.push({ type: 'text', text: item.text, contentIndex: index })
			return
		}
		if (item.type === 'toolCall' && typeof item.id === 'string' && item.id) {
			parts.push({
				type: 'tool',
				contentIndex: index,
				id: item.id,
				name: typeof item.name === 'string' ? item.name : '',
				argumentsText: formatToolArguments(item.arguments, item.argumentsError),
				resultText: '',
				isError: false,
			})
		}
	})
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
		const parts = assistantParts(item.content)
		if (parts.length === 0) return null
		return { role: 'assistant', id, parts }
	}
	return null
}

type ToolHit = { messageIndex: number; partIndex: number }

function attachResult(messages: CompletedMessage[], hit: ToolHit, resultText: string, isError: boolean) {
	const message = messages[hit.messageIndex]
	if (!message || message.role !== 'assistant') return
	const part = message.parts[hit.partIndex]
	if (!part || part.type !== 'tool') return
	part.resultText = resultText
	part.isError = isError
}

/** 最后一条助手消息的 errorMessage。后面有一条没有错误的助手消息时为空。不写进正文。 */
export function historyAssistantError(input: readonly unknown[]): string | null {
	for (let index = input.length - 1; index >= 0; index -= 1) {
		const item = record(input[index])
		if (!item || item.role !== 'assistant') continue
		if (typeof item.errorMessage === 'string' && item.errorMessage !== '') return item.errorMessage
		return null
	}
	return null
}

/** 把 history 的 messages 收成 runtime.replace 能用的已完成消息。有 id 或 timestamp 时用它，否则用输入下标。 */
export function historyToMessages(input: readonly unknown[]): CompletedMessage[] {
	const out: CompletedMessage[] = []
	const tools = new Map<string, ToolHit>()
	input.forEach((message, index) => {
		const item = record(message)
		if (item?.role === 'toolResult') {
			const id = typeof item.toolCallId === 'string' ? item.toolCallId : ''
			const resultText = toolResultText(item.content)
			const isError = item.isError === true
			const hit = id ? tools.get(id) : undefined
			if (hit) {
				attachResult(out, hit, resultText, isError)
				return
			}
			const orphanId = id || `tool${index}`
			out.push({
				role: 'assistant',
				id: messageKey(message, `m${index}`),
				parts: [
					{
						type: 'tool',
						contentIndex: 0,
						id: orphanId,
						name: typeof item.toolName === 'string' ? item.toolName : '',
						argumentsText: '',
						resultText,
						isError,
					},
				],
			})
			tools.set(orphanId, { messageIndex: out.length - 1, partIndex: 0 })
			return
		}
		const mapped = one(message, messageKey(message, `m${index}`))
		if (!mapped) return
		out.push(mapped)
		if (mapped.role !== 'assistant') return
		mapped.parts.forEach((part, partIndex) => {
			if (part.type === 'tool') tools.set(part.id, { messageIndex: out.length - 1, partIndex })
		})
	})
	return out
}
