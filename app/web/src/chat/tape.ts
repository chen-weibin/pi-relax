import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { parseSessionEvent } from '../api/sse/service.ts'

export type TapePhase = 'idle' | 'skip' | 'wait' | 'capture' | 'done'

export type TapeFrame = {
	t: number
	data: string
}

export type Tape = {
	phase: TapePhase
	frames: TapeFrame[]
}

export type TapeFile = {
	version: 1
	frames: { offsetMs: number; data: string }[]
}

export function createTape(): Tape {
	return { phase: 'idle', frames: [] }
}

/** 忙着就先丢掉当前这一轮，空闲则等下一轮的用户消息或 agent_start。 */
export function armTape(busy: boolean): Tape {
	return { phase: busy ? 'skip' : 'wait', frames: [] }
}

function boundary(event: AgentSessionEvent): 'start' | 'end' | null {
	if (event.type === 'agent_start') return 'start'
	if (event.type === 'agent_settled') return 'end'
	if (event.type === 'message_end' && event.message.role === 'user') return 'start'
	return null
}

/** 没变化时返回同一个对象。只收当前会话、从下一轮起到 agent_settled 的原文。 */
export function pushTape(tape: Tape, raw: string, now: number, openSessionId: string | null): Tape {
	if (tape.phase === 'idle' || tape.phase === 'done' || !openSessionId) return tape
	const parsed = parseSessionEvent(raw)
	if (!parsed || parsed.sessionId !== openSessionId) return tape
	const edge = boundary(parsed.event)
	if (tape.phase === 'skip') {
		if (edge !== 'end') return tape
		return { phase: 'wait', frames: [] }
	}
	if (tape.phase === 'wait') {
		if (edge !== 'start') return tape
		return { phase: 'capture', frames: [{ t: now, data: raw }] }
	}
	const frames = tape.frames.concat({ t: now, data: raw })
	if (edge === 'end') return { phase: 'done', frames }
	return { phase: 'capture', frames }
}

export function tapeFile(frames: readonly TapeFrame[]): TapeFile | null {
	const first = frames[0]
	if (!first) return null
	const origin = first.t
	return {
		version: 1,
		frames: frames.map((frame) => ({ offsetMs: frame.t - origin, data: frame.data })),
	}
}

export function parseTapeFile(value: unknown): TapeFile | null {
	if (!value || typeof value !== 'object') return null
	const record = value as { version?: unknown; frames?: unknown }
	if (record.version !== 1 || !Array.isArray(record.frames) || record.frames.length === 0) return null
	const frames: TapeFile['frames'] = []
	let last = 0
	for (const item of record.frames) {
		if (!item || typeof item !== 'object') return null
		const row = item as { offsetMs?: unknown; data?: unknown }
		if (typeof row.offsetMs !== 'number' || !Number.isFinite(row.offsetMs) || row.offsetMs < last) return null
		if (typeof row.data !== 'string' || row.data.length === 0) return null
		last = row.offsetMs
		frames.push({ offsetMs: row.offsetMs, data: row.data })
	}
	return { version: 1, frames }
}
