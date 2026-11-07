import type { AgentSessionEvent, SessionContext } from '@earendil-works/pi-coding-agent'
import { createProject, listProjects } from '../api/projects'
import { getDefaultWorkspace } from '../api/workspace'
import { abortSession, createSession, getSessionHistory, listSessions, promptSession, type StreamingBehavior } from '../api/sessions'
import { getSendChoice } from './modelPicker'
import { subscribeSessionEvents } from '../api/sse'
import { ApiError } from '../api/http'
import { useCatalogStore, useCommonStore, useLocalStore } from '../store'
import { LIST_PAGE_SIZE } from './listPage'
import { draftId, draftTarget } from './draft'
import { projectAgentEvent, type LiveFrame } from './projectEvent'
import type { UnseenRun } from './catalogEvent'
import { rekeyExtensionConversation, setExtensionConversation } from '../extensions/sessionTabs'
import { toCatalogSession, toCatalogSessions } from './service'
import {
	clearOpenSession,
	createTransportState,
	historyArrived,
	historyFailed,
	onSseOpen,
	pushEvent,
	releaseLive,
	selectSession,
	type HistoryPhase,
	type TransportEffect,
	type TransportState,
} from './transport'

type Snapshot = { openSessionId: string | null; phase: HistoryPhase }

let state: TransportState<LiveFrame> = createTransportState()
let history: SessionContext | null = null
let snapshot: Snapshot = { openSessionId: null, phase: 'idle' }
const watchers = new Set<() => void>()
const eventListeners = new Set<(frame: LiveFrame) => void>()

function publish() {
	if (snapshot.openSessionId === state.openSessionId && snapshot.phase === state.phase) return
	snapshot = { openSessionId: state.openSessionId, phase: state.phase }
	for (const watcher of watchers) watcher()
}

function emitEvents(events: readonly LiveFrame[]) {
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

export function subscribeOpenSessionEvents(listener: (frame: LiveFrame) => void): () => void {
	eventListeners.add(listener)
	return () => {
		eventListeners.delete(listener)
	}
}

/** 历史已经 replace。把积下的事件交给订阅者，之后的事件直接转发。 */
export function releaseOpenSession(generation: number) {
	const result = releaseLive(state, generation)
	state = result.state
	emitEvents(result.replay)
}

let captureCreate = false
let captured: { sessionId: string; event: AgentSessionEvent }[] = []
const pendingRuns = new Map<string, UnseenRun>()
const streamingDrafts = new Map<string, unknown>()

export function getStreamingDraft(sessionId: string): unknown | null {
	return streamingDrafts.get(sessionId) ?? null
}

function rememberStatus(id: string, status: string | undefined) {
	useCatalogStore.getState().patchSession(id, { status: status === 'running' ? 'running' : 'idle' })
}

function ingest(sessionId: string, event: AgentSessionEvent) {
	const read = projectAgentEvent(event, pendingRuns.get(sessionId) ?? null, sessionId === state.openSessionId)
	if (read.draft === 'set') streamingDrafts.set(sessionId, read.message)
	else if (read.draft === 'clear') streamingDrafts.delete(sessionId)
	const note = read.catalog
	if (note.pending) pendingRuns.set(sessionId, note.pending)
	else pendingRuns.delete(sessionId)
	if (note.patch) useCatalogStore.getState().patchSession(sessionId, note.patch)
	if (note.unseen !== undefined) useCatalogStore.getState().setUnseenRun(sessionId, note.unseen)
	const result = pushEvent(state, sessionId, { blocks: read.blocks, assistantError: read.assistantError })
	state = result.state
	if (result.forward) emitEvents([result.forward])
}

/** 创建请求还没返回 id 时，先按 sessionId 留下事件。选中后再放进短队列。 */
function takeCaptured(sessionId: string): AgentSessionEvent[] {
	const events = captured.filter((item) => item.sessionId === sessionId).map((item) => item.event)
	captured = []
	captureCreate = false
	return events
}

function queueCaptured(sessionId: string, events: readonly AgentSessionEvent[]) {
	for (const event of events) ingest(sessionId, event)
}

/** 续发指定会话。不看当前打开的是哪一条。`choice` 为假时沿用这条会话自己的模型和思考档。 */
export async function promptConversation(sessionId: string, text: string, choice = true): Promise<void> {
	const trimmed = text.trim()
	if (!trimmed) return
	const record = await promptSession(sessionId, trimmed, undefined, choice ? getSendChoice() : undefined)
	rememberStatus(sessionId, record.status)
}

/** 没有打开的会话就创建并发送。已有则续发。忙时不带 behavior 会得到 BUSY。 */
export async function sendConversation(text: string, behavior?: StreamingBehavior): Promise<void> {
	const trimmed = text.trim()
	if (!trimmed) return
	const openId = state.openSessionId
	if (openId) {
		if (behavior) {
			const record = await promptSession(openId, trimmed, behavior, getSendChoice())
			rememberStatus(openId, record.status)
			return
		}
		await promptConversation(openId, trimmed)
		return
	}
	const catalog = useCatalogStore.getState()
	const cwd = draftTarget(null, catalog.activeDraftCwd, catalog.defaultCwd)
	if (!cwd) throw new Error('没有工作区')
	captureCreate = true
	captured = []
	try {
		const record = await createSession(trimmed, cwd, getSendChoice())
		const session = toCatalogSession(record)
		if (!session.name.trim()) session.name = trimmed
		useCatalogStore.getState().noteSentSession(session)
		useCatalogStore.getState().removeDraft(cwd)
		rekeyExtensionConversation(draftId(cwd), record.id)
		selectOpenSession(record.id)
		queueCaptured(record.id, takeCaptured(record.id))
	} catch (error) {
		captureCreate = false
		captured = []
		throw error
	}
}

export async function abortConversation(): Promise<void> {
	const id = state.openSessionId
	if (!id) return
	const record = await abortSession(id)
	rememberStatus(id, record.status)
}

export function selectOpenSession(sessionId: string) {
	useCatalogStore.getState().setUnseenRun(sessionId, null)
	useCatalogStore.getState().clearActiveDraft()
	const next = selectSession(state, sessionId)
	state = next.state
	if (next.effects.length > 0) history = null
	publish()
	void runEffects(next.effects)
	setExtensionConversation(sessionId, cwdOfSession(sessionId))
}

function dismissOpenSession() {
	const next = clearOpenSession(state)
	if (next === state) return
	state = next
	history = null
	publish()
}

function cwdOfSession(sessionId: string): string | null {
	for (const page of Object.values(useCatalogStore.getState().sessionPages)) {
		const hit = page.sessions.find((session) => session.id === sessionId)
		if (hit?.cwd) return hit.cwd
	}
	return null
}

function cwdOfOpenSession(): string | null {
	const id = state.openSessionId
	return id ? cwdOfSession(id) : null
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
	setExtensionConversation(draftId(cwd), cwd)
}

/** 当前选中会话所在目录，否则当前草稿，再否则默认工作区。都没有则是 null。 */
export function conversationCwd(): string | null {
	const catalog = useCatalogStore.getState()
	return draftTarget(cwdOfOpenSession(), catalog.activeDraftCwd, catalog.defaultCwd)
}

/** 落在当前选中会话的项目；没有选中则用默认工作区。 */
export function openDraftForCurrentProject() {
	const cwd = conversationCwd()
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
		history = body
		state = historyArrived(state, generation, body.messages.length > 0)
		publish()
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
			if (captureCreate) captured.push({ sessionId, event })
			ingest(sessionId, event)
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
