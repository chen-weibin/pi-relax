import { config } from '../../../config'
import { PtyError, type PtyApi, type PtyHandlers } from '../pty'
import { RETRY_DELAY_MS, decodePtyData, ptyWebSocketUrl, shouldReconnectPty } from './ptyFrames'

type Pending = {
	writes: string[]
	resize: { cols: number; rows: number } | null
}

type Slot = {
	cwd: string | null
	cols?: number
	rows?: number
	serverId: string | null
	socket: WebSocket | null
	attempt: number
	ready: boolean
	userClosed: boolean
	retryUntil: number
	retryTimer: number
	listeners: Set<PtyHandlers>
	pending: Pending
	buffered: string[]
	replay: string | null
	decoder: TextDecoder
}

const slots = new Map<string, Slot>()

function emptyPending(): Pending {
	return { writes: [], resize: null }
}

function requireSlot(id: string): Slot {
	const slot = slots.get(id)
	if (!slot || slot.userClosed) throw new PtyError('NOT_FOUND', id)
	return slot
}

function emitOutput(slot: Slot, text: string) {
	if (!text) return
	if (slot.listeners.size === 0) {
		slot.buffered.push(text)
		return
	}
	for (const listener of slot.listeners) listener.onData(text)
}

function emitReplay(slot: Slot, text: string) {
	if (slot.listeners.size === 0) {
		slot.replay = text
		slot.buffered = []
		return
	}
	for (const listener of slot.listeners) listener.onReplay?.(text)
}

function emitNotice(slot: Slot, text: string) {
	emitOutput(slot, `\r\n${text}\r\n`)
}

function flush(slot: Slot) {
	const socket = slot.socket
	if (!slot.ready || !socket || socket.readyState !== WebSocket.OPEN) return
	const pending = slot.pending
	slot.pending = emptyPending()
	for (const data of pending.writes) socket.send(new TextEncoder().encode(data))
	if (pending.resize) {
		slot.cols = pending.resize.cols
		slot.rows = pending.resize.rows
		socket.send(JSON.stringify({ type: 'resize', cols: pending.resize.cols, rows: pending.resize.rows }))
	}
}

function openSocket(slot: Slot, resume: boolean) {
	const gen = ++slot.attempt
	slot.ready = false
	slot.decoder = new TextDecoder()
	void connect(slot, gen, resume)
}

async function connect(slot: Slot, gen: number, resume: boolean) {
	if (!resume && !slot.cwd) {
		if (!slot.userClosed && gen === slot.attempt) emitNotice(slot, '没有工作区')
		return
	}
	if (slot.userClosed || gen !== slot.attempt) return
	const query = resume
		? { id: slot.serverId ?? undefined, cols: slot.cols, rows: slot.rows }
		: { cwd: slot.cwd ?? undefined, cols: slot.cols, rows: slot.rows }
	const socket = new WebSocket(ptyWebSocketUrl(config.apiBaseUrl, query))
	socket.binaryType = 'arraybuffer'
	slot.socket = socket

	socket.addEventListener('message', (ev) => {
		if (gen !== slot.attempt || slot.socket !== socket) return
		const data = typeof ev.data === 'string' ? ev.data : (ev.data as ArrayBuffer)
		const frame = decodePtyData(data, slot.decoder)
		if (frame.kind === 'ready') {
			slot.serverId = frame.id
			slot.retryUntil = 0
			slot.ready = true
			if (frame.replay !== undefined) emitReplay(slot, frame.replay)
			flush(slot)
			return
		}
		if (frame.kind === 'output') emitOutput(slot, frame.text)
		else if (frame.kind === 'notice') emitNotice(slot, frame.text)
	})

	socket.addEventListener('close', (ev) => {
		if (gen !== slot.attempt || slot.socket !== socket) return
		slot.socket = null
		slot.ready = false
		const decision = shouldReconnectPty({
			userClosed: slot.userClosed,
			code: ev.code,
			serverId: slot.serverId,
			now: Date.now(),
			retryUntil: slot.retryUntil,
		})
		if (!decision.retry) {
			if (!slot.userClosed && ev.reason) emitNotice(slot, ev.reason)
			return
		}
		slot.retryUntil = decision.retryUntil
		slot.retryTimer = window.setTimeout(() => openSocket(slot, true), RETRY_DELAY_MS)
	})
}

export const pty: PtyApi = {
	async create(opts) {
		const id = opts?.id ?? crypto.randomUUID()
		const existing = slots.get(id)
		if (existing && !existing.userClosed) return { id }
		const slot: Slot = {
			cwd: opts?.cwd ?? null,
			cols: opts?.cols,
			rows: opts?.rows,
			serverId: null,
			socket: null,
			attempt: 0,
			ready: false,
			userClosed: false,
			retryUntil: 0,
			retryTimer: 0,
			listeners: new Set(),
			pending: emptyPending(),
			buffered: [],
			replay: null,
			decoder: new TextDecoder(),
		}
		slots.set(id, slot)
		openSocket(slot, false)
		return { id }
	},
	async write(id, data) {
		const slot = requireSlot(id)
		slot.pending.writes.push(data)
		flush(slot)
	},
	async resize(id, cols, rows) {
		const slot = requireSlot(id)
		slot.cols = cols
		slot.rows = rows
		slot.pending.resize = { cols, rows }
		flush(slot)
	},
	async dispose(id) {
		const slot = slots.get(id)
		if (!slot || slot.userClosed) return
		slot.userClosed = true
		window.clearTimeout(slot.retryTimer)
		const socket = slot.socket
		slot.socket = null
		slot.ready = false
		slots.delete(id)
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify({ type: 'close' }))
		}
		socket?.close()
	},
	subscribe(id, handlers) {
		const slot = requireSlot(id)
		slot.listeners.add(handlers)
		if (slot.replay !== null) {
			const replay = slot.replay
			slot.replay = null
			handlers.onReplay?.(replay)
		}
		const buffered = slot.buffered
		slot.buffered = []
		for (const text of buffered) handlers.onData(text)
		return () => {
			slot.listeners.delete(handlers)
		}
	},
}
