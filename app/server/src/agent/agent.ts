import { existsSync } from 'node:fs'
import type { AgentSession, AgentSessionEvent, SessionManager } from '@earendil-works/pi-coding-agent'
import {
	createSessionManager,
	defaultCwd,
	deleteSessionFile,
	findSessionInfo,
	historyById,
	historyFrom,
	listSessions,
	openSession,
	recordFromInfo,
	recordFromManager,
	type SessionHistory,
	type SessionRecord,
	type SessionStatus,
} from '../sessions/index.js'
import { abortPolicyFor, type SettingsPatch } from '../config/settings.js'
import { BusyError, HttpError, SessionNotFoundError } from '../utils/errors.js'
import { getSupportedThinkingLevels } from '@earendil-works/pi-ai'
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

	hotRecords(): SessionRecord[] {
		return [...this.slots.values()].map((slot) =>
			recordFromManager(slot.session.sessionManager, this.statusOf(slot.session.sessionManager.getSessionId())!),
		)
	}

	async list(cwd?: string): Promise<SessionRecord[]> {
		const disk = await listSessions(cwd)
		const byId = new Map(disk.map((item) => [item.id, item]))
		for (const hot of this.hotRecords()) {
			if (cwd && hot.cwd !== cwd) continue
			byId.set(hot.id, { ...byId.get(hot.id), ...hot })
		}
		return [...byId.values()].sort((a, b) => b.modified.localeCompare(a.modified))
	}

	async get(id: string): Promise<SessionRecord> {
		const slot = this.slots.get(id)
		if (slot) {
			return recordFromManager(slot.session.sessionManager, this.statusOf(id)!)
		}
		const info = await findSessionInfo(id)
		if (!info) throw new SessionNotFoundError(id)
		return recordFromInfo(info, 'idle')
	}

	async history(id: string): Promise<SessionHistory> {
		const slot = this.slots.get(id)
		if (slot) return historyFrom(slot.session.sessionManager)
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
			void slot.session.prompt(text, { streamingBehavior: input.streamingBehavior }).catch(() => {
				slot.running = false
			})
			return recordFromManager(slot.session.sessionManager, 'running')
		}
		slot.running = true
		void slot.session.prompt(text).catch(() => {
			slot.running = false
		})
		return recordFromManager(slot.session.sessionManager, 'running')
	}

	async rename(id: string, name: string): Promise<SessionRecord> {
		const slot = await this.open(id)
		slot.session.setSessionName(name)
		return recordFromManager(slot.session.sessionManager, this.statusOf(id)!)
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
		return { ...recordFromManager(slot.session.sessionManager, 'idle'), cleared }
	}

	async remove(id: string): Promise<void> {
		const slot = this.slots.get(id)
		if (slot) {
			await this.stop(slot)
			const current = this.slots.get(id)
			if (current) {
				current.unsubscribe()
				current.session.dispose()
				this.slots.delete(id)
			}
		}
		const deleted = await deleteSessionFile(id)
		if (!deleted && !slot) throw new SessionNotFoundError(id)
	}

	private emit(sessionId: string, event: AgentSessionEvent): void {
		const slot = this.slots.get(sessionId)
		if (!slot) return
		if (event.type === 'agent_start') slot.running = true
		if (event.type === 'agent_settled') slot.running = false
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
		return this.attach(manager, model)
	}

	private async open(id: string): Promise<Slot> {
		const existing = this.slots.get(id)
		if (existing) return existing
		const info = await findSessionInfo(id)
		if (!info) throw new SessionNotFoundError(id)
		return this.attach(openSession(info.path))
	}

	private async attach(manager: SessionManager, model?: Awaited<ReturnType<typeof modelForNewSession>>): Promise<Slot> {
		const { session } = await this.createRuntime({
			cwd: manager.getCwd(),
			sessionManager: manager,
			model,
		})
		const id = session.sessionManager.getSessionId()
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
