import type { SessionEventEnvelope } from './types'

/** 把一条 SSE data 收成信封。注释行和坏 JSON 返回 null。 */
export function parseSessionEvent(data: string): SessionEventEnvelope | null {
	let parsed: unknown
	try {
		parsed = JSON.parse(data)
	} catch {
		return null
	}
	if (!parsed || typeof parsed !== 'object') return null
	const record = parsed as { sessionId?: unknown; event?: unknown }
	if (typeof record.sessionId !== 'string' || !record.event || typeof record.event !== 'object') return null
	return { sessionId: record.sessionId, event: record.event as SessionEventEnvelope['event'] }
}
