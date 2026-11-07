import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { UnseenRun } from '../session/catalogEvent'
import { ensureDraft, type SessionDraft } from '../session/draft'
import { placeNewProject } from '../session/groupCatalog'
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
	drafts: SessionDraft[]
	activeDraftCwd: string | null
	draftNotice: number
	unseenRuns: Record<string, UnseenRun>
	sseStatus: SseStatus
	setProjectsLoading: (loading: boolean) => void
	noteNewProject: (project: CatalogProject) => void
	replaceProjectPage: (projects: CatalogProject[], total: number, append: boolean) => void
	setDefaultWorkspace: (cwd: string, name: string) => void
	setProjectsError: (message: string) => void
	beginSessionPage: (cwd: string) => void
	applySessionPage: (cwd: string, sessions: CatalogSession[], total: number, append: boolean) => void
	setSessionPageError: (cwd: string, message: string) => void
	openDraft: (cwd: string) => void
	clearActiveDraft: () => void
	removeDraft: (cwd: string) => void
	noteSentSession: (session: CatalogSession) => void
	patchSession: (id: string, patch: { status?: CatalogSession['status']; name?: string; modified?: string }) => void
	dropSession: (id: string) => void
	setUnseenRun: (id: string, outcome: UnseenRun | null) => void
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
		drafts: [],
		activeDraftCwd: null,
		draftNotice: 0,
		unseenRuns: {},
		sseStatus: 'connecting',
		setProjectsLoading: (loading) =>
			set((state) => {
				state.projectsLoading = loading
			}),
		noteNewProject: (project) =>
			set((state) => {
				const next = placeNewProject(state.projects, project)
				if (next === state.projects) return
				state.projects = next
				state.projectsTotal += 1
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
					const extra = page.sessions.filter(
						(session) => session.status === 'running' && !sessions.some((item) => item.id === session.id),
					)
					page.sessions = extra.length === 0 ? sessions : [...extra, ...sessions]
					page.total = total + extra.length
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
		openDraft: (cwd) =>
			set((state) => {
				state.drafts = ensureDraft(state.drafts, cwd, Date.now())
				state.activeDraftCwd = cwd
				state.draftNotice += 1
			}),
		clearActiveDraft: () =>
			set((state) => {
				state.activeDraftCwd = null
			}),
		removeDraft: (cwd) =>
			set((state) => {
				state.drafts = state.drafts.filter((draft) => draft.cwd !== cwd)
				if (state.activeDraftCwd === cwd) state.activeDraftCwd = null
			}),
		noteSentSession: (session) =>
			set((state) => {
				const page = state.sessionPages[session.cwd] ?? blankSessionPage()
				const existed = page.sessions.some((item) => item.id === session.id)
				page.sessions = [session, ...page.sessions.filter((item) => item.id !== session.id)]
				if (!existed) page.total += 1
				state.sessionPages[session.cwd] = page
			}),
		patchSession: (id, patch) =>
			set((state) => {
				for (const page of Object.values(state.sessionPages)) {
					const row = page.sessions.find((session) => session.id === id)
					if (!row) continue
					if (patch.status !== undefined && row.status !== patch.status) row.status = patch.status
					if (patch.name !== undefined && row.name !== patch.name) row.name = patch.name
					if (patch.modified !== undefined && row.modified !== patch.modified) row.modified = patch.modified
				}
			}),
		dropSession: (id) =>
			set((state) => {
				if (state.unseenRuns[id] !== undefined) delete state.unseenRuns[id]
				for (const page of Object.values(state.sessionPages)) {
					const next = page.sessions.filter((session) => session.id !== id)
					if (next.length === page.sessions.length) continue
					page.sessions = next
					page.total = Math.max(0, page.total - 1)
				}
			}),
		setUnseenRun: (id, outcome) =>
			set((state) => {
				if (outcome === null) {
					if (state.unseenRuns[id] === undefined) return
					delete state.unseenRuns[id]
					return
				}
				if (state.unseenRuns[id] === outcome) return
				state.unseenRuns[id] = outcome
			}),
		setSseStatus: (status) =>
			set((state) => {
				state.sseStatus = status
			}),
	})),
)
