import { http } from '../http'
import type { ProjectList, ProjectRecord } from './types'

export async function createProject(cwd: string): Promise<ProjectRecord> {
	const { data } = await http.post<ProjectRecord>('/api/projects', { cwd })
	return data
}

export async function listProjects(offset: number, limit: number): Promise<ProjectList> {
	const { data } = await http.get<ProjectList>('/api/projects', { params: { offset, limit } })
	return data
}
