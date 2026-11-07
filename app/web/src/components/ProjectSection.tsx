import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { UnseenRun } from '../session/catalogEvent'
import { projectRows, sessionModifiedAt, sessionTitle } from '../session/groupCatalog'
import { DRAFT_TITLE, draftId } from '../session/draft'
import {
	getTransportSnapshot,
	loadMoreProjects,
	loadProjectSessions,
	openProjectDraft,
	deleteConversation,
	renameConversation,
	selectOpenSession,
	subscribeTransport,
} from '../session'
import { useCatalogStore, useLocalStore, type SessionPage } from '../store'
import { Expandable } from '../ui/Expandable'
import { ProjectItem } from './ProjectItem'
import { ProjectSectionHeader } from './ProjectSectionHeader'
import { AddProjectDialog } from './AddProjectDialog'

export interface ProjectSectionProps {
	className?: string
}

function rowStatus(
	running: boolean,
	unseen: UnseenRun | undefined,
): 'loading' | 'success' | 'failure' | undefined {
	if (running) return 'loading'
	return unseen
}

function sessionNote(page: SessionPage | undefined, hasDraft: boolean): string | null {
	if (!page || page.loading) return '加载中'
	if (page.error) return page.error
	if (page.sessions.length === 0 && !hasDraft) return '没有会话'
	return null
}

export function ProjectSection({ className }: ProjectSectionProps) {
	const { projects, projectsTotal, projectsLoading, projectsError, defaultCwd, defaultName, listsReady, sessionPages, unseenRuns } =
		useCatalogStore(
			useShallow((state) => ({
				projects: state.projects,
				projectsTotal: state.projectsTotal,
				projectsLoading: state.projectsLoading,
				projectsError: state.projectsError,
				defaultCwd: state.defaultCwd,
				defaultName: state.defaultName,
				listsReady: state.listsReady,
				sessionPages: state.sessionPages,
				unseenRuns: state.unseenRuns,
			})),
		)
	const openSessionId = useSyncExternalStore(subscribeTransport, () => getTransportSnapshot().openSessionId)
	const projectsCollapsed = useLocalStore((state) => state.projectsCollapsed)
	const setProjectCollapsed = useLocalStore((state) => state.setProjectCollapsed)
	const drafts = useCatalogStore((state) => state.drafts)
	const activeDraftCwd = useCatalogStore((state) => state.activeDraftCwd)
	const draftNotice = useCatalogStore((state) => state.draftNotice)
	const rows = projectRows(projects, defaultCwd, defaultName)
	const [sectionExpanded, setSectionExpanded] = useState(true)
	const [addOpen, setAddOpen] = useState(false)

	useEffect(() => {
		if (draftNotice === 0) return
		setSectionExpanded(true)
	}, [draftNotice])

	useEffect(() => {
		if (!listsReady) return
		for (const row of projectRows(projects, defaultCwd, defaultName)) {
			if (!projectsCollapsed.includes(row.id)) loadProjectSessions(row.cwd)
		}
	}, [listsReady, projects, defaultCwd, defaultName, projectsCollapsed])

	const toggleProject = useCallback((id: string, cwd: string) => {
		const collapsed = useLocalStore.getState().projectsCollapsed.includes(id)
		setProjectCollapsed(id, !collapsed)
		if (collapsed) loadProjectSessions(cwd)
	}, [setProjectCollapsed])

	const handleFilter = () => {
		// TODO: filter behavior
	}

	const handleAddProject = () => {
		setAddOpen(true)
	}

	const closeAddProject = useCallback(() => setAddOpen(false), [])

	const handleAddSession = (cwd: string) => {
		openProjectDraft(cwd)
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
							const draft = drafts.find((item) => item.cwd === row.cwd)
							const hasMore = Boolean(page?.loaded && page.sessions.length < page.total && !page.loading)
							const sessions = [
								...(draft
									? [
											{
												id: draftId(draft.cwd),
												title: DRAFT_TITLE,
												createdAt: draft.createdAt,
												active: activeDraftCwd === draft.cwd,
												onClick: () => openProjectDraft(row.cwd),
												status: 'normal' as const,
											},
										]
									: []),
								...(page?.sessions ?? []).map((session) => {
									const status = rowStatus(session.status === 'running', unseenRuns[session.id])
									return {
										id: session.id,
										title: sessionTitle(session),
										createdAt: sessionModifiedAt(session),
										active: session.id === openSessionId,
										onClick: () => selectOpenSession(session.id),
										onRename: (name: string) => renameConversation(session.id, name),
										onDelete: () => deleteConversation(session.id),
										...(status ? { status } : {}),
									}
								}),
							]
							return (
								<ProjectItem
									key={row.id}
									name={row.name}
									sessions={sessions}
									expanded={!projectsCollapsed.includes(row.id)}
									onToggle={() => toggleProject(row.id, row.cwd)}
									onAddSession={() => handleAddSession(row.cwd)}
									sessionNote={projectsCollapsed.includes(row.id) ? null : sessionNote(page, Boolean(draft))}
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
			<AddProjectDialog open={addOpen} onClose={closeAddProject} />
		</section>
	)
}
