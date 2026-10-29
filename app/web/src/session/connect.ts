import type { AgentSessionEvent, SessionContext } from '@earendil-works/pi-coding-agent'
import { createProject, listProjects } from '../api/projects'
import { getDefaultWorkspace } from '../api/workspace'
import { getSessionHistory, listSessions } from '../api/sessions'
import { subscribeSessionEvents } from '../api/sse'
import { ApiError } from '../api/http'
import { useCatalogStore, useCommonStore, useLocalStore } from '../store'
import { LIST_PAGE_SIZE } from './listPage'
import { draftTarget } from './draft'
import { toCatalogSessions } from './service'
import {
	clearOpenSession,
	createTransportState,
	historyFailed,
	historyLoaded,
	onSseOpen,
	pushEvent,
	selectSession,
	type HistoryPhase,
	type TransportEffect,
	type TransportState,
} from './transport'

type Snapshot = { openSessionId: string | null; phase: HistoryPhase }

let state: TransportState<AgentSessionEvent> = createTransportState()
let history: SessionContext | null = null
let snapshot: Snapshot = { openSessionId: null, phase: 'idle' }
const watchers = new Set<() => void>()
const eventListeners = new Set<(event: AgentSessionEvent) => void>()

function publish() {
	if (snapshot.openSessionId === state.openSessionId && snapshot.phase === state.phase) return
	snapshot = { openSessionId: state.openSessionId, phase: state.phase }
	for (const watcher of watchers) watcher()
}

function emitEvents(events: readonly AgentSessionEvent[]) {
	if (events.length === 0) return
	for (const event of events) {
		for (const listener of eventListeners) listener(event)
	}
}

export function subscribeTransport(listener: () => void): () => void {
	watchers.add(listener)
	return () => {
		watchers.delete(listener)
	}
}

export function getTransportSnapshot(): Snapshot {
	return snapshot
}

export function getOpenSessionHistory(): SessionContext | null {
	return history
}

export function getTransportGeneration(): number {
	return state.generation
}

export function subscribeOpenSessionEvents(listener: (event: AgentSessionEvent) => void): () => void {
	eventListeners.add(listener)
	return () => {
		eventListeners.delete(listener)
	}
}

export function selectOpenSession(sessionId: string) {
	useCatalogStore.getState().clearActiveDraft()
	const next = selectSession(state, sessionId)
	state = next.state
	if (next.effects.length > 0) history = null
	publish()
	void runEffects(next.effects)
}

function dismissOpenSession() {
	const next = clearOpenSession(state)
	if (next === state) return
	state = next
	history = null
	publish()
}

function cwdOfOpenSession(): string | null {
	const id = state.openSessionId
	if (!id) return null
	for (const page of Object.values(useCatalogStore.getState().sessionPages)) {
		const hit = page.sessions.find((session) => session.id === id)
		if (hit) return hit.cwd
	}
	return null
}

function expandProject(cwd: string) {
	const catalog = useCatalogStore.getState()
	const id = catalog.defaultCwd === cwd ? 'default' : catalog.projects.find((project) => project.cwd === cwd)?.id
	if (id) useLocalStore.getState().setProjectCollapsed(id, false)
}

/** 在这个目录放一条草稿并选中。不拉历史。 */
export function openProjectDraft(cwd: string) {
	dismissOpenSession()
	useCatalogStore.getState().openDraft(cwd)
	expandProject(cwd)
	useCommonStore.getState().setMainView('conversation')
}

/** 落在当前选中会话的项目；没有选中则用默认工作区。 */
export function openDraftForCurrentProject() {
	const catalog = useCatalogStore.getState()
	const cwd = draftTarget(cwdOfOpenSession(), catalog.activeDraftCwd, catalog.defaultCwd)
	if (cwd) openProjectDraft(cwd)
}

let projectGeneration = 0
let projectsInflight = false
const sessionInflight = new Set<string>()

async function loadDefaultWorkspace(generation: number) {
	try {
		const workspace = await getDefaultWorkspace()
		if (generation !== projectGeneration) return
		useCatalogStore.getState().setDefaultWorkspace(workspace.cwd, workspace.name)
	} catch {
		// 项目列表的错误单独显示。这里失败就保持上一次拿到的路径。
	}
}

async function loadProjectPage(append: boolean): Promise<'ok' | 'stale' | 'error'> {
	const generation = append ? projectGeneration : ++projectGeneration
	if (append && projectsInflight) return 'stale'
	const catalog = useCatalogStore.getState()
	if (append && catalog.projects.length >= catalog.projectsTotal) return 'ok'
	const offset = append ? catalog.projects.length : 0
	projectsInflight = true
	catalog.setProjectsLoading(true)
	if (!append) void loadDefaultWorkspace(generation)
	try {
		const page = await listProjects(offset, LIST_PAGE_SIZE)
		if (generation !== projectGeneration) return 'stale'
		useCatalogStore.getState().replaceProjectPage(page.projects, page.total, append)
		return 'ok'
	} catch (error) {
		if (generation !== projectGeneration) return 'stale'
		const message = error instanceof Error ? error.message : '列表加载失败'
		useCatalogStore.getState().setProjectsError(message)
		return 'error'
	} finally {
		if (generation === projectGeneration) projectsInflight = false
	}
}

async function revealProject(cwd: string): Promise<boolean> {
	if (useCatalogStore.getState().projects.some((project) => project.cwd === cwd)) return true
	while (useCatalogStore.getState().projects.length < useCatalogStore.getState().projectsTotal) {
		const before = useCatalogStore.getState().projects.length
		const result = await loadProjectPage(true)
		if (useCatalogStore.getState().projects.some((project) => project.cwd === cwd)) return true
		if (result !== 'ok' || useCatalogStore.getState().projects.length === before) return false
	}
	return false
}

/** 登记一个已有目录。已登记则沿用那一行。成功后打开该目录的草稿。 */
export async function registerProjectDirectory(cwd: string): Promise<void> {
	try {
		const created = await createProject(cwd)
		const loaded = await loadProjectPage(false)
		if (loaded !== 'ok') useCatalogStore.getState().noteNewProject(created)
		openProjectDraft(created.cwd)
	} catch (error) {
		if (!(error instanceof ApiError) || error.code !== 'ALREADY_EXISTS') throw error
		const visible = await revealProject(cwd)
		if (!visible) throw error
		openProjectDraft(cwd)
	}
}

export function loadMoreProjects() {
	void loadProjectPage(true)
}

export function loadProjectSessions(cwd: string, more = false) {
	if (sessionInflight.has(cwd)) return
	const page = useCatalogStore.getState().sessionPages[cwd]
	if (!more && page?.loaded) return
	if (more && page && page.sessions.length >= page.total) return
	const offset = more && page ? page.sessions.length : 0
	sessionInflight.add(cwd)
	useCatalogStore.getState().beginSessionPage(cwd)
	void listSessions(cwd, offset, LIST_PAGE_SIZE)
		.then((body) => {
			useCatalogStore.getState().applySessionPage(cwd, toCatalogSessions(body.sessions), body.total, more)
		})
		.catch((error: unknown) => {
			const message = error instanceof Error ? error.message : '会话加载失败'
			useCatalogStore.getState().setSessionPageError(cwd, message)
		})
		.finally(() => {
			sessionInflight.delete(cwd)
		})
}

async function loadLists() {
	await loadProjectPage(false)
}

async function loadHistory(sessionId: string, generation: number) {
	try {
		const body = await getSessionHistory(sessionId)
		if (generation !== state.generation) return
		const result = historyLoaded(state, generation)
		history = body
		state = result.state
		publish()
		emitEvents(result.replay)
	} catch {
		if (generation !== state.generation) return
		history = null
		state = historyFailed(state, generation)
		publish()
	}
}

async function runEffects(effects: TransportEffect[]) {
	for (const effect of effects) {
		if (effect.type === 'load-lists') await loadLists()
		else await loadHistory(effect.sessionId, effect.generation)
	}
}

export function startSessionTransport(): () => void {
	const controller = new AbortController()
	let opened = false
	useCatalogStore.getState().setSseStatus('connecting')
	void loadLists()
	void subscribeSessionEvents({
		signal: controller.signal,
		onOpen() {
			useCatalogStore.getState().setSseStatus('open')
			const first = !opened
			opened = true
			if (first) return
			const next = onSseOpen(state, false)
			state = next.state
			if (next.effects.some((effect) => effect.type === 'load-history')) history = null
			publish()
			void runEffects(next.effects)
		},
		onReconnecting() {
			useCatalogStore.getState().setSseStatus('reconnecting')
		},
		onEvent(sessionId, event) {
			const result = pushEvent(state, sessionId, event)
			state = result.state
			if (result.forward) emitEvents([result.forward])
		},
	}).catch(() => {
		if (!controller.signal.aborted) useCatalogStore.getState().setSseStatus('reconnecting')
	})
	return () => {
		controller.abort()
		state = createTransportState()
		history = null
		publish()
	}
}
