import type { AgentSessionEvent, SessionContext } from '@earendil-works/pi-coding-agent'
import { listProjects } from '../api/projects'
import { getDefaultWorkspace } from '../api/workspace'
import { getSessionHistory, listSessions } from '../api/sessions'
import { subscribeSessionEvents } from '../api/sse'
import { useCatalogStore } from '../store'
import { LIST_PAGE_SIZE } from './listPage'
import { toCatalogSessions } from './service'
import {
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

export function subscribeOpenSessionEvents(listener: (event: AgentSessionEvent) => void): () => void {
	eventListeners.add(listener)
	return () => {
		eventListeners.delete(listener)
	}
}

export function selectOpenSession(sessionId: string) {
	const next = selectSession(state, sessionId)
	state = next.state
	if (next.effects.length > 0) history = null
	publish()
	void runEffects(next.effects)
}

let projectGeneration = 0
let projectsInflight = false
const sessionInflight = new Set<string>()

async function loadDefaultWorkspace(generation: number) {
	try {
		const workspace = await getDefaultWorkspace()
		if (generation !== projectGeneration) return
		useCatalogStore.getState().setDefaultCwd(workspace.cwd)
	} catch {
		// 项目列表的错误单独显示。这里失败就保持上一次拿到的路径。
	}
}

async function loadProjectPage(append: boolean) {
	const generation = append ? projectGeneration : ++projectGeneration
	if (append && projectsInflight) return
	const catalog = useCatalogStore.getState()
	if (append && catalog.projects.length >= catalog.projectsTotal) return
	const offset = append ? catalog.projects.length : 0
	projectsInflight = true
	catalog.setProjectsLoading(true)
	if (!append) void loadDefaultWorkspace(generation)
	try {
		const page = await listProjects(offset, LIST_PAGE_SIZE)
		if (generation !== projectGeneration) return
		useCatalogStore.getState().replaceProjectPage(page.projects, page.total, append)
	} catch (error) {
		if (generation !== projectGeneration) return
		const message = error instanceof Error ? error.message : '列表加载失败'
		useCatalogStore.getState().setProjectsError(message)
	} finally {
		if (generation === projectGeneration) projectsInflight = false
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
