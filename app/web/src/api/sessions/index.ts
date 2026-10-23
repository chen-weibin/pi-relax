import { http } from '../http'
import type { SessionContext, SessionList } from './types'

export async function listSessions(cwd: string, offset: number, limit: number): Promise<SessionList> {
	const { data } = await http.get<SessionList>('/api/sessions', { params: { cwd, offset, limit } })
	return data
}

export async function getSessionHistory(id: string): Promise<SessionContext> {
	const { data } = await http.get<SessionContext>(`/api/sessions/${encodeURIComponent(id)}/history`)
	return data
}
