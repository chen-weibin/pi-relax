import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import type { SessionStatus } from './catalogTypes'

export type CatalogPatch = {
	status?: SessionStatus
	name?: string
	modified?: string
}

export type UnseenRun = 'success' | 'failure'

/**
 * `pending` 是还没 `agent_settled` 的结果。
 * `unseen` 省略表示不改侧栏上的成功/失败；`null` 清掉。
 */
export type CatalogNote = {
	patch: CatalogPatch | null
	pending: UnseenRun | null
	unseen?: UnseenRun | null
}

function userModified(message: { role: string }): string | null {
	if (message.role !== 'user') return null
	const timestamp = (message as { timestamp?: unknown }).timestamp
	if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null
	return new Date(timestamp).toISOString()
}

function outcomeOf(messages: readonly { role: string }[]): UnseenRun {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index]
		if (!message || message.role !== 'assistant') continue
		const reason = (message as { stopReason?: unknown }).stopReason
		if (reason === 'error' || reason === 'aborted') return 'failure'
		return 'success'
	}
	return 'success'
}

/** 一条 SSE 对目录和「没在看的结束标记」的影响。不建块。 */
export function noteCatalogEvent(pending: UnseenRun | null, event: AgentSessionEvent, viewing: boolean): CatalogNote {
	if (event.type === 'agent_start') return { patch: { status: 'running' }, pending: null, unseen: null }
	if (event.type === 'agent_end') {
		return { patch: null, pending: event.willRetry ? null : outcomeOf(event.messages) }
	}
	if (event.type === 'agent_settled') {
		const patch: CatalogPatch = { status: 'idle' }
		if (viewing || !pending) return { patch, pending: null }
		return { patch, pending: null, unseen: pending }
	}
	if (event.type === 'session_info_changed') return { patch: { name: event.name ?? '' }, pending }
	if (event.type === 'message_end') {
		const modified = userModified(event.message)
		return { patch: modified ? { modified } : null, pending }
	}
	if (event.type === 'entry_appended' && event.entry.type === 'message') {
		const modified = userModified(event.entry.message)
		return { patch: modified ? { modified } : null, pending }
	}
	return { patch: null, pending }
}
