import { http } from './http'

export type CustomModel = {
	id: string
	name?: string
	reasoning?: boolean
	contextWindow?: number
	maxTokens?: number
}

export type CustomProvider = {
	id: string
	name?: string
	baseUrl: string
	api: string
	apiKeySet: boolean
	models: CustomModel[]
}

export type CustomProviderMeta = {
	apis: string[]
	defaults: {
		api: string
		contextWindow: number
		maxTokens: number
	}
}

export type CustomProviderBody = {
	id?: string
	name?: string
	baseUrl: string
	api: string
	apiKey?: string
	models: CustomModel[]
}

export async function getCustomProviderMeta(): Promise<CustomProviderMeta> {
	const { data } = await http.get<CustomProviderMeta>('/api/custom-providers/meta')
	return data
}

export async function listCustomProviders(): Promise<CustomProvider[]> {
	const { data } = await http.get<{ providers: CustomProvider[] }>('/api/custom-providers')
	return data.providers
}

export async function createCustomProvider(body: CustomProviderBody): Promise<CustomProvider> {
	const { data } = await http.post<{ provider: CustomProvider }>('/api/custom-providers', body)
	return data.provider
}

export async function updateCustomProvider(id: string, body: CustomProviderBody): Promise<CustomProvider> {
	const { data } = await http.put<{ provider: CustomProvider }>(
		`/api/custom-providers/${encodeURIComponent(id)}`,
		body,
	)
	return data.provider
}

export async function deleteCustomProvider(id: string): Promise<void> {
	await http.delete(`/api/custom-providers/${encodeURIComponent(id)}`)
}
