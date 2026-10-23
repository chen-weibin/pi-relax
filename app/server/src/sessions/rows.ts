import { relaxDb } from '../db/connection.js'
import type { SessionRecord, SessionStatus } from './types.js'

export type SessionRow = {
	id: string
	cwd: string
	path: string
	name: string | null
	created: string
	modified: string
	completed: boolean
	deletedAt: string | null
}

type SessionSql = {
	id: string
	cwd: string
	path: string
	name: string | null
	created: string
	modified: string
	completed: number
	deleted_at: string | null
}

function fromSql(row: SessionSql): SessionRow {
	return {
		id: row.id,
		cwd: row.cwd,
		path: row.path,
		name: row.name,
		created: row.created,
		modified: row.modified,
		completed: row.completed === 1,
		deletedAt: row.deleted_at,
	}
}

export function sessionRow(id: string): SessionRow | undefined {
	const row = relaxDb().prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as SessionSql | undefined
	return row ? fromSql(row) : undefined
}

export function sessionKnown(id: string): boolean {
	const row = relaxDb().prepare(`SELECT id FROM sessions WHERE id = ?`).get(id) as { id: string } | undefined
	return row !== undefined
}

/** 旧的完成标记只在补行时读一次。新的完成状态写在 sessions.completed。 */
export function legacyCompleted(id: string): boolean {
	const row = relaxDb().prepare(`SELECT completed FROM session_marks WHERE id = ?`).get(id) as
		| { completed: number }
		| undefined
	return row?.completed === 1
}

export function insertSession(input: {
	id: string
	cwd: string
	path: string
	name: string | null
	created: string
	modified: string
	completed: boolean
}): void {
	relaxDb()
		.prepare(
			`INSERT INTO sessions (id, cwd, path, name, created, modified, completed, deleted_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
			 ON CONFLICT(id) DO NOTHING`,
		)
		.run(input.id, input.cwd, input.path, input.name, input.created, input.modified, input.completed ? 1 : 0)
}

export function listSessionRows(cwd?: string): SessionRow[] {
	const db = relaxDb()
	const rows = (
		cwd
			? db.prepare(`SELECT * FROM sessions WHERE deleted_at IS NULL AND cwd = ? ORDER BY modified DESC, id DESC`).all(cwd)
			: db.prepare(`SELECT * FROM sessions WHERE deleted_at IS NULL ORDER BY modified DESC, id DESC`).all()
	) as SessionSql[]
	return rows.map(fromSql)
}

/** 用户消息落盘后改 modified。name 还是 NULL 时写入这句；空字符串是清空，不再填回。 */
export function noteUserMessage(id: string, modified: string, text: string): void {
	relaxDb()
		.prepare(
			`UPDATE sessions
			 SET modified = ?,
			     name = CASE WHEN name IS NULL AND trim(?) != '' THEN ? ELSE name END
			 WHERE id = ? AND deleted_at IS NULL`,
		)
		.run(modified, text, text, id)
}

export function renameSession(id: string, name: string): void {
	relaxDb().prepare(`UPDATE sessions SET name = ? WHERE id = ? AND deleted_at IS NULL`).run(name, id)
}

export function setSessionCompleted(id: string, completed: boolean): void {
	relaxDb().prepare(`UPDATE sessions SET completed = ? WHERE id = ? AND deleted_at IS NULL`).run(completed ? 1 : 0, id)
}

export function softDeleteSession(id: string): void {
	relaxDb()
		.prepare(`UPDATE sessions SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`)
		.run(new Date().toISOString(), id)
}

export function toSessionRecord(row: SessionRow, status: SessionStatus): SessionRecord {
	return {
		id: row.id,
		cwd: row.cwd,
		name: row.name ?? '',
		created: row.created,
		modified: row.modified,
		status,
		completed: row.completed,
	}
}
