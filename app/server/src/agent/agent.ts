import { existsSync } from 'node:fs'
import type { AgentSession, AgentSessionEvent, SessionManager } from '@earendil-works/pi-coding-agent'
import {
	createSessionManager,
	defaultCwd,
	historyById,
	historyFrom,
	openSession,
	removeSessionFile,
	type SessionHistory,
	type SessionRecord,
	type SessionStatus,
} from '../sessions/index.js'
import { withStreamingMessage } from '../sessions/history.js'
import { ensureSessionRow, fillUnsetSessionName, fillUnsetSessionNames } from '../sessions/index-row.js'
import {
	hardDeleteSession,
	listSessionRows,
	noteUserMessage,
	renameSession,
	sessionRow,
	softDeleteSession,
	toSessionRecord,
} from '../sessions/rows.js'
import { backfillSessions, dropMissingSessionFiles } from '../sessions/sync.js'
import { messageText } from '../utils/text.js'
import { abortPolicyFor, readGlobalSettings, type SettingsPatch } from '../config/settings.js'
import { BusyError, HttpError, SessionNotFoundError } from '../utils/errors.js'
import { getSupportedThinkingLevels } from '@earendil-works/pi-ai'
import { ensureProject } from '../projects/store.js'
import { createPiRuntime, type RuntimeFactory } from './factory.js'
import { modelForNewSession, modelForSwitch, writeDefault } from './models.js'

const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
type ThinkingLevelName = (typeof THINKING_LEVELS)[number]
export type StreamingBehavior = 'steer' | 'followUp'

export type ClearedQueue = { steering: string[]; followUp: string[] }
export type AbortResult = SessionRecord & { cleared: ClearedQueue }

type Slot = {
	session: AgentSession
	running: boolean
	unsubscribe: () => void
}

export type SessionEventListener = (sessionId: string, event: AgentSessionEvent) => void

export class Agent {
	private readonly slots = new Map<string, Slot>()
	private readonly listeners = new Set<SessionEventListener>()
	private readonly createRuntime: RuntimeFactory

	constructor(createRuntime: RuntimeFactory = createPiRuntime) {
		this.createRuntime = createRuntime
	}

	subscribe(listener: SessionEventListener): () => void {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
			this.disposeIdle()
		}
	}

	statusOf(id: string): SessionStatus | undefined {
		const slot = this.slots.get(id)
		if (!slot) return undefined
		if (slot.running || slot.session.isStreaming) return 'running'
		return 'idle'
	}

	async list(cwd?: string): Promise<SessionRecord[]> {
		backfillSessions(cwd)
		dropMissingSessionFiles(cwd, (id) => this.awaitingFile(id))
		fillUnsetSessionNames(cwd)
		return listSessionRows(cwd).map((row) => toSessionRecord(row, this.statusOf(row.id) ?? 'idle'))
	}

	async get(id: string): Promise<SessionRecord> {
		let row = sessionRow(id)
		if (!row) {
			backfillSessions()
			row = sessionRow(id)
		}
		if (!row || row.deletedAt) throw new SessionNotFoundError(id)
		if (!existsSync(row.path) && !this.awaitingFile(id)) {
			softDeleteSession(id)
			throw new SessionNotFoundError(id)
		}
		if (row.name === null) {
			fillUnsetSessionName(row)
			row = sessionRow(id) ?? row
		}
		return toSessionRecord(row, this.statusOf(id) ?? 'idle')
	}

	async history(id: string): Promise<SessionHistory> {
		const slot = this.slots.get(id)
		if (slot) {
			const streaming = slot.session.state.streamingMessage
			const base = historyFrom(slot.session.sessionManager)
			return withStreamingMessage(base, streaming)
		}
		const history = await historyById(id)
		if (!history) throw new SessionNotFoundError(id)
		return history
	}

	async prompt(input: {
		text: string
		sessionId?: string
		cwd?: string
		streamingBehavior?: StreamingBehavior
		thinkingLevel?: string
		provider?: string
		model?: string
	}): Promise<SessionRecord> {
		const text = input.text.trim()
		if (!text) throw new Error('text is required')
		const choice = modelChoice(input.provider, input.model)
		const slot = input.sessionId
			? await this.open(input.sessionId)
			: await this.createNew(input.cwd ?? defaultCwd(), choice, input.thinkingLevel)
		const busy = slot.running || slot.session.isStreaming
		if (busy && !input.streamingBehavior) throw new BusyError()
		if (input.sessionId && choice) await this.useModelIfChanged(slot, choice)
		if (input.thinkingLevel !== undefined) {
			assertThinkingLevel(input.thinkingLevel, slot.session.getAvailableThinkingLevels())
			slot.session.setThinkingLevel(input.thinkingLevel)
		}
		if (busy && input.streamingBehavior) {
			void slot.session.prompt(text, { streamingBehavior: input.streamingBehavior }).catch((error: unknown) => {
				console.error(error)
			})
			return this.record(slot.session.sessionManager.getSessionId(), 'running')
		}
		slot.running = true
		void slot.session.prompt(text).catch(() => {
			slot.running = false
		})
		return this.record(slot.session.sessionManager.getSessionId(), 'running')
	}

	async rename(id: string, name: string): Promise<SessionRecord> {
		const slot = await this.open(id)
		slot.session.setSessionName(name)
		renameSession(id, name)
		return this.record(id, this.statusOf(id) ?? 'idle')
	}

	/** 把刚写入全局 settings 的出队模式套到还在内存里的会话。 */
	applyQueueModes(patch: Pick<SettingsPatch, 'steeringMode' | 'followUpMode'>): void {
		for (const slot of this.slots.values()) {
			if (patch.steeringMode) slot.session.setSteeringMode(patch.steeringMode)
			if (patch.followUpMode) slot.session.setFollowUpMode(patch.followUpMode)
		}
	}

	async abort(id: string): Promise<AbortResult> {
		const slot = this.slots.get(id)
		if (!slot) {
			const record = await this.get(id)
			return { ...record, status: 'idle', cleared: { steering: [], followUp: [] } }
		}
		const cleared = await this.stop(slot)
		return { ...this.record(id, 'idle'), cleared }
	}

	async remove(id: string): Promise<void> {
		const slot = this.slots.get(id)
		const row = sessionRow(id)
		if (!slot && (!row || row.deletedAt)) throw new SessionNotFoundError(id)
		if (slot) {
			await this.stop(slot)
			const current = this.slots.get(id)
			if (current) {
				current.unsubscribe()
				current.session.dispose()
				this.slots.delete(id)
			}
		}
		if (!row || row.deletedAt) return
		if (readGlobalSettings().sessionDelete === 'physical') {
			await removeSessionFile(row.path)
			hardDeleteSession(id)
			return
		}
		softDeleteSession(id)
	}

	private record(id: string, status: SessionStatus): SessionRecord {
		const row = sessionRow(id)
		if (!row || row.deletedAt) throw new SessionNotFoundError(id)
		return toSessionRecord(row, status)
	}

	/** 路径已记下、文件还没写出、也还没有用户或助手消息。列表不能把这种行删掉。 */
	private awaitingFile(id: string): boolean {
		const slot = this.slots.get(id)
		if (!slot) return false
		const manager = slot.session.sessionManager
		const file = manager.getSessionFile()
		if (!file || existsSync(file)) return false
		return !manager
			.buildSessionContext()
			.messages.some((message) => message.role === 'user' || message.role === 'assistant')
	}

	private emit(sessionId: string, event: AgentSessionEvent): void {
		const slot = this.slots.get(sessionId)
		if (!slot) return
		if (event.type === 'agent_start') slot.running = true
		if (event.type === 'agent_settled') slot.running = false
		if (event.type === 'entry_appended' && event.entry.type === 'message' && event.entry.message.role === 'user') {
			rememberUserMessage(sessionId, event.entry.message)
		}
		if (event.type === 'message_end' && event.message.role === 'user') {
			rememberUserMessage(sessionId, event.message)
		}
		for (const listener of this.listeners) {
			try {
				listener(sessionId, event)
			} catch (error) {
				console.error(error)
			}
		}
		if (event.type === 'agent_settled') this.disposeIdle()
	}

	/** 只改全局默认，不改这条会话的 model_change。会话记录留到发送且模型不同时再写。 */
	async selectModel(id: string, provider: string, modelId: string): Promise<SessionRecord> {
		const record = await this.get(id)
		await modelForSwitch(provider, modelId)
		await writeDefault(provider, modelId)
		return record
	}

	private async useModelIfChanged(slot: Slot, choice: { provider: string; id: string }): Promise<void> {
		const model = await modelForSwitch(choice.provider, choice.id)
		const current = slot.session.model
		if (current?.provider === model.provider && current.id === model.id) return
		await slot.session.setModel(model)
	}

	private async createNew(
		cwd: string,
		choice: { provider: string; id: string } | undefined,
		thinkingLevel: string | undefined,
	): Promise<Slot> {
		const model = await modelForNewSession(choice)
		if (thinkingLevel !== undefined) assertThinkingLevel(thinkingLevel, getSupportedThinkingLevels(model))
		return this.create(cwd, model)
	}

	private async create(cwd: string, model: Awaited<ReturnType<typeof modelForNewSession>>): Promise<Slot> {
		const manager = createSessionManager(cwd)
		ensureProject(manager.getCwd())
		return this.attach(manager, model)
	}

	private async open(id: string): Promise<Slot> {
		const existing = this.slots.get(id)
		if (existing) return existing
		let row = sessionRow(id)
		if (row?.deletedAt) throw new SessionNotFoundError(id)
		if (!row) {
			backfillSessions()
			row = sessionRow(id)
		}
		if (!row || row.deletedAt || !existsSync(row.path)) throw new SessionNotFoundError(id)
		return this.attach(openSession(row.path))
	}

	private async attach(manager: SessionManager, model?: Awaited<ReturnType<typeof modelForNewSession>>): Promise<Slot> {
		const { session } = await this.createRuntime({
			cwd: manager.getCwd(),
			sessionManager: manager,
			model,
		})
		const id = session.sessionManager.getSessionId()
		ensureSessionRow(session.sessionManager)
		const unsubscribe = session.subscribe((event) => this.emit(id, event))
		const slot: Slot = { session, running: false, unsubscribe }
		this.slots.set(id, slot)
		return slot
	}

	private async stop(slot: Slot): Promise<ClearedQueue> {
		const policy = abortPolicyFor(slot.session.sessionManager.getCwd())
		if (policy === 'abort-only') {
			await slot.session.abort()
			slot.running = false
			return { steering: [], followUp: [] }
		}
		const cleared = slot.session.clearQueue()
		await slot.session.abort()
		slot.running = false
		return { steering: [...cleared.steering], followUp: [...cleared.followUp] }
	}

	private disposeIdle(): void {
		if (this.listeners.size > 0) return
		for (const [id, slot] of this.slots) {
			if (slot.running || slot.session.isStreaming) continue
			const file = slot.session.sessionManager.getSessionFile()
			if (!file || !existsSync(file)) continue
			slot.unsubscribe()
			slot.session.dispose()
			this.slots.delete(id)
		}
	}
}

function rememberUserMessage(sessionId: string, message: { timestamp: number; content?: unknown }): void {
	try {
		noteUserMessage(sessionId, new Date(message.timestamp).toISOString(), messageText(message))
	} catch (error) {
		console.error(error)
	}
}

function modelChoice(provider?: string, model?: string): { provider: string; id: string } | undefined {
	if (provider === undefined && model === undefined) return undefined
	if (!provider || !model) throw new HttpError(400, 'BAD_REQUEST', 'provider and model must be provided together')
	return { provider, id: model }
}

function assertThinkingLevel(level: string, supported: readonly string[]): asserts level is ThinkingLevelName {
	if (!THINKING_LEVELS.includes(level as ThinkingLevelName)) {
		throw new HttpError(400, 'BAD_REQUEST', `thinkingLevel must be one of ${THINKING_LEVELS.join(', ')}`)
	}
	if (!supported.includes(level)) {
		throw new HttpError(
			400,
			'BAD_REQUEST',
			`thinkingLevel "${level}" is not supported. Supported: ${supported.join(', ')}`,
		)
	}
}
