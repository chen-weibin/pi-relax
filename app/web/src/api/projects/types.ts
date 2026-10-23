export type ProjectRecord = {
	id: string
	cwd: string
	name: string
	position: number
	created: string
	modified: string
}

export type ProjectList = {
	projects: ProjectRecord[]
	total: number
}
