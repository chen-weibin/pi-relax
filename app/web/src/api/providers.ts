import { http } from './http'

export type ProviderKind = 'builtin' | 'custom'

export type ProviderSummary = {
	id: string
	name: string
	configured: boolean
	kind: ProviderKind
}

export async function listProviders(): Promise<ProviderSummary[]> {
	const { data } = await http.get<{ providers: ProviderSummary[] }>('/api/providers')
	return data.providers
}

export async function putProviderKey(id: string, apiKey: string): Promise<void> {
	await http.put(`/api/providers/${encodeURIComponent(id)}`, { apiKey })
}

export async function deleteProviderKey(id: string): Promise<void> {
	await http.delete(`/api/providers/${encodeURIComponent(id)}`)
}
