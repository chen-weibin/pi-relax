import type { SessionHistory } from './types.js'

function sameMessage(left: { role: string; timestamp: number }, right: { role: string; timestamp: number }): boolean {
	return left.role === right.role && left.timestamp === right.timestamp
}

/** 热会话还没落盘的那条接在文件上下文后面。同一条引用，或相同角色和时间戳，不重复。 */
export function withStreamingMessage(
	history: SessionHistory,
	streaming: SessionHistory['messages'][number] | undefined,
): SessionHistory {
	if (!streaming) return history
	if (history.messages.includes(streaming)) return history
	if (history.messages.some((message) => sameMessage(message, streaming))) return history
	return { ...history, messages: [...history.messages, streaming] }
}
