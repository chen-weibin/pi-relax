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
import { BusyError, SessionNotFoundError } from '../utils/errors.js'
import { createPiRuntime, type RuntimeFactory } from './factory.js'

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

	async prompt(input: { text: string; sessionId?: string; cwd?: string }): Promise<SessionRecord> {
		const text = input.text.trim()
		if (!text) throw new Error('text is required')
		const slot = input.sessionId
			? await this.open(input.sessionId)
			: await this.create(input.cwd ?? defaultCwd())
		if (slot.running || slot.session.isStreaming) throw new BusyError()
		slot.running = true
		const id = slot.session.sessionManager.getSessionId()
		void slot.session.prompt(text).catch(() => {
			slot.running = false
		})
		return recordFromManager(slot.session.sessionManager, 'running')
	}

	async abort(id: string): Promise<SessionRecord> {
		const slot = this.slots.get(id)
		if (!slot) {
			const record = await this.get(id)
			return { ...record, status: 'idle' }
		}
		await slot.session.abort()
		slot.running = false
		return recordFromManager(slot.session.sessionManager, 'idle')
	}

	async remove(id: string): Promise<void> {
		const slot = this.slots.get(id)
		if (slot) {
			await slot.session.abort()
			slot.unsubscribe()
			slot.session.dispose()
			this.slots.delete(id)
		}
		const deleted = await deleteSessionFile(id)
		if (!deleted && !slot) throw new SessionNotFoundError(id)
	}

	private emit(sessionId: string, event: AgentSessionEvent): void {
		const slot = this.slots.get(sessionId)
		if (!slot) return
		if (event.type === 'agent_start') slot.running = true
		if (event.type === 'agent_end' || event.type === 'agent_settled') {
			slot.running = false
		}
		for (const listener of this.listeners) {
			try {
				listener(sessionId, event)
			} catch (error) {
				console.error(error)
			}
		}
		if (event.type === 'agent_settled' || event.type === 'agent_end') {
			this.disposeIdle()
		}
	}

	private async create(cwd: string): Promise<Slot> {
		const manager = createSessionManager(cwd)
		return this.attach(manager)
	}

	private async open(id: string): Promise<Slot> {
		const existing = this.slots.get(id)
		if (existing) return existing
		const info = await findSessionInfo(id)
		if (!info) throw new SessionNotFoundError(id)
		return this.attach(openSession(info.path))
	}

	private async attach(manager: SessionManager): Promise<Slot> {
		const { session } = await this.createRuntime({
			cwd: manager.getCwd(),
			sessionManager: manager,
		})
		const id = session.sessionManager.getSessionId()
		const unsubscribe = session.subscribe((event) => this.emit(id, event))
		const slot: Slot = { session, running: false, unsubscribe }
		this.slots.set(id, slot)
		return slot
	}

	private disposeIdle(): void {
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
