import { http } from '../http'

export async function getDefaultWorkspace(): Promise<{ cwd: string; name: string }> {
	const { data } = await http.get<{ cwd: string; name: string }>('/api/workspace')
	return data
}
