import { http } from '../http'
import type { SessionContext, SessionList, SessionRecord } from './types'

export type StreamingBehavior = 'steer' | 'followUp'

export async function listSessions(cwd: string, offset: number, limit: number): Promise<SessionList> {
	const { data } = await http.get<SessionList>('/api/sessions', { params: { cwd, offset, limit } })
	return data
}

export async function getSessionHistory(id: string): Promise<SessionContext> {
	const { data } = await http.get<SessionContext>(`/api/sessions/${encodeURIComponent(id)}/history`)
	return data
}

export async function createSession(text: string, cwd: string): Promise<SessionRecord> {
	const { data } = await http.post<SessionRecord>('/api/sessions', { text, cwd })
	return data
}

export async function promptSession(
	id: string,
	text: string,
	streamingBehavior?: StreamingBehavior,
): Promise<SessionRecord> {
	const { data } = await http.post<SessionRecord>(`/api/sessions/${encodeURIComponent(id)}/prompt`, {
		text,
		...(streamingBehavior ? { streamingBehavior } : {}),
	})
	return data
}

export async function abortSession(id: string): Promise<SessionRecord> {
	const { data } = await http.post<SessionRecord>(`/api/sessions/${encodeURIComponent(id)}/abort`)
	return data
}
