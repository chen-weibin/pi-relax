import type { CatalogProject, CatalogSession } from './catalogTypes'

export function sessionTitle(session: CatalogSession): string {
	const name = session.name.trim()
	if (name) return name
	return session.firstMessage
}

export function sessionModifiedAt(session: CatalogSession): number {
	const ms = Date.parse(session.modified)
	return Number.isNaN(ms) ? 0 : ms
}

export type ProjectRow = {
	id: string
	name: string
	cwd: string
}

/** 新登记的项目 position 最大，放在已加载列表最前。同一 cwd 不重复插入。 */
export function placeNewProject(projects: CatalogProject[], project: CatalogProject): CatalogProject[] {
	if (projects.some((item) => item.cwd === project.cwd)) return projects
	return [project, ...projects]
}

/** 默认工作区固定第一行，名字用接口给的目录名。已登记的同一 cwd 不再重复。 */
export function projectRows(projects: CatalogProject[], defaultCwd: string | null, defaultName: string | null): ProjectRow[] {
	const rows: ProjectRow[] = []
	if (defaultCwd) rows.push({ id: 'default', name: defaultName || defaultCwd, cwd: defaultCwd })
	for (const project of projects) {
		if (project.cwd === defaultCwd) continue
		rows.push({ id: project.id, name: project.name, cwd: project.cwd })
	}
	return rows
}
