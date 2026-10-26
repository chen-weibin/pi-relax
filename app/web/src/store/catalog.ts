import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { CatalogProject, CatalogSession, SseStatus } from '../session/catalogTypes'

export type { CatalogProject, CatalogSession, SessionStatus, SseStatus } from '../session/catalogTypes'

export type SessionPage = {
	sessions: CatalogSession[]
	total: number
	loading: boolean
	error: string | null
	loaded: boolean
}

interface CatalogState {
	projects: CatalogProject[]
	projectsTotal: number
	projectsLoading: boolean
	projectsError: string | null
	defaultCwd: string | null
	defaultName: string | null
	listsReady: boolean
	sessionPages: Record<string, SessionPage>
	sseStatus: SseStatus
	setProjectsLoading: (loading: boolean) => void
	replaceProjectPage: (projects: CatalogProject[], total: number, append: boolean) => void
	setDefaultWorkspace: (cwd: string, name: string) => void
	setProjectsError: (message: string) => void
	beginSessionPage: (cwd: string) => void
	applySessionPage: (cwd: string, sessions: CatalogSession[], total: number, append: boolean) => void
	setSessionPageError: (cwd: string, message: string) => void
	setSseStatus: (status: SseStatus) => void
}

function blankSessionPage(): SessionPage {
	return { sessions: [], total: 0, loading: false, error: null, loaded: false }
}

export const useCatalogStore = create<CatalogState>()(
	immer((set) => ({
		projects: [],
		projectsTotal: 0,
		projectsLoading: false,
		projectsError: null,
		defaultCwd: null,
		defaultName: null,
		listsReady: false,
		sessionPages: {},
		sseStatus: 'connecting',
		setProjectsLoading: (loading) =>
			set((state) => {
				state.projectsLoading = loading
			}),
		replaceProjectPage: (projects, total, append) =>
			set((state) => {
				state.projectsTotal = total
				state.listsReady = true
				state.projectsError = null
				state.projectsLoading = false
				if (!append) {
					state.projects = projects
					return
				}
				const seen = new Set(state.projects.map((project) => project.id))
				for (const project of projects) {
					if (seen.has(project.id)) continue
					state.projects.push(project)
					seen.add(project.id)
				}
			}),
		setDefaultWorkspace: (cwd, name) =>
			set((state) => {
				state.defaultCwd = cwd
				state.defaultName = name
			}),
		setProjectsError: (message) =>
			set((state) => {
				state.projectsError = message
				state.projectsLoading = false
				state.listsReady = true
			}),
		beginSessionPage: (cwd) =>
			set((state) => {
				const page = state.sessionPages[cwd] ?? blankSessionPage()
				page.loading = true
				page.error = null
				state.sessionPages[cwd] = page
			}),
		applySessionPage: (cwd, sessions, total, append) =>
			set((state) => {
				const page = state.sessionPages[cwd] ?? blankSessionPage()
				page.total = total
				page.loading = false
				page.error = null
				page.loaded = true
				if (!append) {
					page.sessions = sessions
				} else {
					const seen = new Set(page.sessions.map((session) => session.id))
					for (const session of sessions) {
						if (seen.has(session.id)) continue
						page.sessions.push(session)
						seen.add(session.id)
					}
				}
				state.sessionPages[cwd] = page
			}),
		setSessionPageError: (cwd, message) =>
			set((state) => {
				const page = state.sessionPages[cwd] ?? blankSessionPage()
				page.loading = false
				page.error = message
				state.sessionPages[cwd] = page
			}),
		setSseStatus: (status) =>
			set((state) => {
				state.sseStatus = status
			}),
	})),
)
