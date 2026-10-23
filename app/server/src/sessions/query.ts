import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Agent } from '../agent/agent.js'
import { getRelaxAgentDir } from '../config/home.js'
import { HttpError, SessionNotFoundError } from '../utils/errors.js'
import { timeInRange, type PageWindow } from '../utils/query.js'
import type { SessionRecord } from './types.js'

export type ListedSession = SessionRecord

export type SessionQuery = {
	cwd?: string
	modifiedFrom?: string
	modifiedTo?: string
	completed?: boolean
	page?: PageWindow
}

function byRecent(records: SessionRecord[]): SessionRecord[] {
	return [...records].sort((a, b) => b.modified.localeCompare(a.modified) || b.id.localeCompare(a.id))
}

/** 读 sessions 表，再在内存里过滤和截取。不扫 JSONL 重算 modified。 */
export async function querySessions(agent: Agent, input: SessionQuery): Promise<{ sessions: ListedSession[]; total: number }> {
	const records = byRecent(await agent.list(input.cwd))
	const filtered = records.filter((record) => {
		if (!timeInRange(record.modified, input.modifiedFrom, input.modifiedTo)) return false
		if (input.completed === undefined) return true
		return record.completed === input.completed
	})
	const page = input.page
	const slice = page ? filtered.slice(page.offset, page.offset + page.limit) : filtered
	return { total: filtered.length, sessions: slice }
}

export async function requireSession(agent: Agent, id: string): Promise<SessionRecord> {
	return agent.get(id)
}

/** 停掉内存里的会话，只写 deleted_at。JSONL 留在磁盘上。 */
export async function purgeSessions(agent: Agent, records: SessionRecord[]): Promise<number> {
	for (const record of records) {
		try {
			await agent.remove(record.id)
		} catch (error) {
			if (!(error instanceof SessionNotFoundError)) throw error
		}
	}
	return records.length
}

export async function sessionsForCwd(agent: Agent, cwd: string): Promise<SessionRecord[]> {
	return byRecent(await agent.list(cwd))
}

export function matchesPurge(
	record: SessionRecord,
	input: { modifiedBefore?: string; completed?: true },
): boolean {
	const before = input.modifiedBefore ? Date.parse(record.modified) < Date.parse(input.modifiedBefore) : true
	const done = input.completed ? record.completed : true
	if (input.modifiedBefore && input.completed) return before && done
	if (input.modifiedBefore) return before
	return done
}

export async function sessionStorage(): Promise<{ files: number; bytes: number }> {
	const root = join(getRelaxAgentDir(), 'sessions')
	let files = 0
	let bytes = 0
	async function walk(dir: string): Promise<void> {
		let entries
		try {
			entries = await readdir(dir, { withFileTypes: true })
		} catch (error) {
			const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
			if (code === 'ENOENT') return
			throw error
		}
		for (const entry of entries) {
			const path = join(dir, entry.name)
			if (entry.isDirectory()) {
				await walk(path)
				continue
			}
			if (!entry.isFile()) continue
			const info = await stat(path)
			bytes += info.size
			if (entry.name.endsWith('.jsonl')) files += 1
		}
	}
	await walk(root)
	return { files, bytes }
}

export function purgeBody(body: unknown): { modifiedBefore?: string; completed?: true } {
	if (!body || typeof body !== 'object') throw new HttpError(400, 'BAD_REQUEST', 'modifiedBefore or completed is required')
	const record = body as Record<string, unknown>
	let modifiedBefore: string | undefined
	if ('modifiedBefore' in record && record.modifiedBefore !== undefined) {
		if (typeof record.modifiedBefore !== 'string' || Number.isNaN(Date.parse(record.modifiedBefore))) {
			throw new HttpError(400, 'BAD_REQUEST', 'modifiedBefore must be an ISO time')
		}
		modifiedBefore = record.modifiedBefore
	}
	let completed: true | undefined
	if ('completed' in record && record.completed !== undefined) {
		if (record.completed !== true) throw new HttpError(400, 'BAD_REQUEST', 'completed must be true')
		completed = true
	}
	if (!modifiedBefore && !completed) {
		throw new HttpError(400, 'BAD_REQUEST', 'modifiedBefore or completed is required')
	}
	return { modifiedBefore, completed }
}
