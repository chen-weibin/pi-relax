import { useCallback, useState } from 'react'
import { ProjectItem, type ProjectItemSession } from './ProjectItem'
import { ProjectSectionHeader } from './ProjectSectionHeader'

export interface Project {
	id: string
	name: string
	sessions: ProjectItemSession[]
}

export interface ProjectSectionProps {
	className?: string
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function buildMockProjects(): Project[] {
	const now = Date.now()
	return [
		{
			id: 'p-vscode-ext',
			name: 'cloudlab/vscode-extension/vscode-paper',
			sessions: [
				{ id: 's1', title: '(1) 111UI implementation ...', createdAt: now - 20 * HOUR },
			],
		},
		{
			id: 'p-web-oper',
			name: 'cloudlab/web-oper-position',
			sessions: [
				{ id: 's2', title: '数据调整', createdAt: now - 1 * DAY },
				{ id: 's3', title: '111UI implementation gui...', createdAt: now - 6 * DAY },
			],
		},
		{
			id: 'p-web-os',
			name: 'cloudlab/web-os-platform',
			sessions: [
				{ id: 's4', title: 'https://s.apifox.cn/45cd9...', createdAt: now - 18 * HOUR },
				{ id: 's5', title: 'Course detail sharing issue', createdAt: now - 1 * DAY },
				{ id: 's6', title: 'Course detail sharing issue', createdAt: now - 1 * DAY },
				{ id: 's7', title: 'Card style optimization', createdAt: now - 7 * DAY },
				{ id: 's8', title: 'Activity task display styles', createdAt: now - 8 * DAY },
				{ id: 's9', title: 'Course detail page logic', createdAt: now - 8 * DAY },
			],
		},
		{
			id: 'p-web-workspace',
			name: 'cloudlab/web-workspace',
			sessions: [
				{ id: 's10', title: 'Course export link addition', createdAt: now - 18 * HOUR },
				{ id: 's11', title: '(2) Course directory link f...', createdAt: now - 8 * DAY },
				{ id: 's12', title: 'More', createdAt: now - 8 * DAY },
			],
		},
		{
			id: 'p-vscode-plugin',
			name: 'vscode-extension',
			sessions: [
				{ id: 's13', title: 'Vscode-paper plugin loa...', createdAt: now - 13 * DAY },
			],
		},
	]
}

export function ProjectSection({ className }: ProjectSectionProps) {
	const [projects] = useState<Project[]>(buildMockProjects)
	const [expandedIds, setExpandedIds] = useState<Set<string>>(
		() => new Set(projects.map((p) => p.id)),
	)
	const [sectionExpanded, setSectionExpanded] = useState(true)

	const toggleProject = useCallback((id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}, [])

	const handleFilter = () => {
		// TODO: filter behavior
	}

	const handleAddProject = () => {
		// TODO: add project behavior
	}

	const handleAddSession = (_projectId: string) => {
		// TODO: add session behavior
	}

	return (
		<section className={className}>
			<div className="sticky top-0 z-10 bg-sidebar">
				<ProjectSectionHeader
					expanded={sectionExpanded}
					onToggleExpand={() => setSectionExpanded((v) => !v)}
					onFilter={handleFilter}
					onAddProject={handleAddProject}
				/>
			</div>
			{sectionExpanded && (
				<div className="flex flex-col gap-0.5 pl-1.5 pb-1.5">
					{projects.map((p) => (
						<ProjectItem
							key={p.id}
							name={p.name}
							sessions={p.sessions}
							expanded={expandedIds.has(p.id)}
							onToggle={() => toggleProject(p.id)}
							onAddSession={() => handleAddSession(p.id)}
						/>
					))}
				</div>
			)}
		</section>
	)
}
