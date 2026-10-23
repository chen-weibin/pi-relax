import { useCallback, useState, useSyncExternalStore } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { projectRows, sessionModifiedAt, sessionTitle } from '../session/groupCatalog'
import { getTransportSnapshot, loadMoreProjects, loadProjectSessions, selectOpenSession, subscribeTransport } from '../session'
import { useCatalogStore, type SessionPage } from '../store'
import { Expandable } from '../ui/Expandable'
import { ProjectItem } from './ProjectItem'
import { ProjectSectionHeader } from './ProjectSectionHeader'

export interface ProjectSectionProps {
	className?: string
}

function sessionNote(page: SessionPage | undefined): string | null {
	if (!page || page.loading) return '加载中'
	if (page.error) return page.error
	if (page.sessions.length === 0) return '没有会话'
	return null
}

export function ProjectSection({ className }: ProjectSectionProps) {
	const { projects, projectsTotal, projectsLoading, projectsError, defaultCwd, listsReady, sessionPages } = useCatalogStore(
		useShallow((state) => ({
			projects: state.projects,
			projectsTotal: state.projectsTotal,
			projectsLoading: state.projectsLoading,
			projectsError: state.projectsError,
			defaultCwd: state.defaultCwd,
			listsReady: state.listsReady,
			sessionPages: state.sessionPages,
		})),
	)
	const openSessionId = useSyncExternalStore(subscribeTransport, () => getTransportSnapshot().openSessionId)
	const rows = projectRows(projects, defaultCwd)
	const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
	const [sectionExpanded, setSectionExpanded] = useState(true)

	const toggleProject = useCallback((id: string, cwd: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
		if (!expandedIds.has(id)) loadProjectSessions(cwd)
	}, [expandedIds])

	const handleFilter = () => {
		// TODO: filter behavior
	}

	const handleAddProject = () => {
		// TODO: add project behavior
	}

	const handleAddSession = (_projectId: string) => {
		// TODO: add session behavior
	}

	const moreProjects = listsReady && projects.length < projectsTotal

	return (
		<section className={className}>
			<div className="sticky top-0 z-10 bg-sidebar">
				<ProjectSectionHeader
					expanded={sectionExpanded}
					onToggleExpand={() => setSectionExpanded((value) => !value)}
					onFilter={handleFilter}
					onAddProject={handleAddProject}
				/>
			</div>
			<Expandable open={sectionExpanded} duration={200}>
				{projectsError && rows.length === 0 ? (
					<p className="px-3 py-2 text-xs text-fg-3">{projectsError}</p>
				) : !listsReady ? (
					<p className="px-3 py-2 text-xs text-fg-3">加载中</p>
				) : rows.length === 0 ? (
					<p className="px-3 py-2 text-center text-xs text-fg-3">没有更多了</p>
				) : (
					<div className="flex flex-col gap-0.5 pl-1.5 pb-1.5">
						{projectsError ? <p className="px-3 py-2 text-xs text-fg-3">{projectsError}</p> : null}
						{rows.map((row) => {
							const page = sessionPages[row.cwd]
							const hasMore = Boolean(page?.loaded && page.sessions.length < page.total && !page.loading)
							return (
								<ProjectItem
									key={row.id}
									name={row.name}
									sessions={(page?.sessions ?? []).map((session) => ({
										id: session.id,
										title: sessionTitle(session),
										createdAt: sessionModifiedAt(session),
										active: session.id === openSessionId,
										onClick: () => selectOpenSession(session.id),
										...(session.status === 'running' ? { status: 'loading' as const } : {}),
									}))}
									expanded={expandedIds.has(row.id)}
									onToggle={() => toggleProject(row.id, row.cwd)}
									onAddSession={() => handleAddSession(row.id)}
									sessionNote={expandedIds.has(row.id) ? sessionNote(page) : null}
									{...(hasMore ? { onLoadMoreSessions: () => loadProjectSessions(row.cwd, true) } : {})}
								/>
							)
						})}
						{moreProjects ? (
							<button
								type="button"
								className="px-3 py-1 text-left text-xs text-fg-3 hover:text-fg-2 disabled:opacity-50"
								disabled={projectsLoading}
								onClick={() => loadMoreProjects()}
							>
								{projectsLoading ? '加载中' : '更多'}
							</button>
						) : null}
					</div>
				)}
			</Expandable>
		</section>
	)
}
