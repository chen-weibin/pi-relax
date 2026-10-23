import { http } from '../http'
import type { ProjectList } from './types'

export async function listProjects(offset: number, limit: number): Promise<ProjectList> {
	const { data } = await http.get<ProjectList>('/api/projects', { params: { offset, limit } })
	return data
}
