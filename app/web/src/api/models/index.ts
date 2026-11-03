import { http } from '../http'
import type { AvailableModels, DefaultModel, ThinkingLevels } from './types'

export type { AvailableModels, DefaultModel, ModelSummary, ThinkingLevels } from './types'

export async function listModels(): Promise<AvailableModels> {
	const { data } = await http.get<AvailableModels>('/api/models')
	return data
}

export async function getDefaultModel(): Promise<{ model: DefaultModel | null }> {
	const { data } = await http.get<{ model: DefaultModel | null }>('/api/models/default')
	return data
}

export async function putDefaultModel(provider: string, model: string): Promise<{ model: DefaultModel }> {
	const { data } = await http.put<{ model: DefaultModel }>('/api/models/default', { provider, model })
	return data
}

export async function getThinkingLevels(provider: string, id: string): Promise<ThinkingLevels> {
	const { data } = await http.get<ThinkingLevels>('/api/models/thinking-levels', { params: { provider, id } })
	return data
}
