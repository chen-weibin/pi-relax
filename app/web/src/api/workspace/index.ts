import { http } from '../http'

export async function getDefaultWorkspace(): Promise<{ cwd: string }> {
	const { data } = await http.get<{ cwd: string }>('/api/workspace')
	return data
}
