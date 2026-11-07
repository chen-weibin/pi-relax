import { http } from '../http'
import type { SessionContext, SessionList, SessionRecord } from './types'

export type StreamingBehavior = 'steer' | 'followUp'

export type PromptChoice = {
	provider?: string
	model?: string
	thinkingLevel?: string
}

function choiceBody(choice?: PromptChoice): PromptChoice {
	if (!choice) return {}
	return {
		...(choice.provider && choice.model ? { provider: choice.provider, model: choice.model } : {}),
		...(choice.thinkingLevel ? { thinkingLevel: choice.thinkingLevel } : {}),
	}
}

export async function listSessions(cwd: string, offset: number, limit: number): Promise<SessionList> {
	const { data } = await http.get<SessionList>('/api/sessions', { params: { cwd, offset, limit } })
	return data
}

export async function getSessionHistory(id: string): Promise<SessionContext> {
	const { data } = await http.get<SessionContext>(`/api/sessions/${encodeURIComponent(id)}/history`)
	return data
}

export async function createSession(text: string, cwd: string, choice?: PromptChoice): Promise<SessionRecord> {
	const { data } = await http.post<SessionRecord>('/api/sessions', { text, cwd, ...choiceBody(choice) })
	return data
}

export async function promptSession(
	id: string,
	text: string,
	streamingBehavior?: StreamingBehavior,
	choice?: PromptChoice,
): Promise<SessionRecord> {
	const { data } = await http.post<SessionRecord>(`/api/sessions/${encodeURIComponent(id)}/prompt`, {
		text,
		...(streamingBehavior ? { streamingBehavior } : {}),
		...choiceBody(choice),
	})
	return data
}

/** 只把所选模型写成全局默认，不改这条会话的上次模型。 */
export async function selectSessionModel(id: string, provider: string, model: string): Promise<SessionRecord> {
	const { data } = await http.post<SessionRecord>(`/api/sessions/${encodeURIComponent(id)}/model`, { provider, model })
	return data
}

export async function abortSession(id: string): Promise<SessionRecord> {
	const { data } = await http.post<SessionRecord>(`/api/sessions/${encodeURIComponent(id)}/abort`)
	return data
}

export async function deleteSession(id: string): Promise<void> {
	await http.delete(`/api/sessions/${encodeURIComponent(id)}`)
}

export async function renameSession(id: string, name: string): Promise<SessionRecord> {
	const { data } = await http.post<SessionRecord>(`/api/sessions/${encodeURIComponent(id)}/name`, { name })
	return data
}
