import { relaxDb } from '../db/connection.js'

export function completedIds(ids: string[]): Set<string> {
	if (ids.length === 0) return new Set()
	const placeholders = ids.map(() => '?').join(', ')
	const rows = relaxDb()
		.prepare(`SELECT id FROM session_marks WHERE completed = 1 AND id IN (${placeholders})`)
		.all(...ids) as { id: string }[]
	return new Set(rows.map((row) => row.id))
}

export function isCompleted(id: string): boolean {
	const row = relaxDb().prepare(`SELECT completed FROM session_marks WHERE id = ?`).get(id) as
		| { completed: number }
		| undefined
	return row?.completed === 1
}

/** false 时删掉行，没有行即未完成。 */
export function setCompleted(id: string, cwd: string, completed: boolean): void {
	const db = relaxDb()
	if (!completed) {
		db.prepare(`DELETE FROM session_marks WHERE id = ?`).run(id)
		return
	}
	db.prepare(
		`INSERT INTO session_marks (id, cwd, completed) VALUES (?, ?, 1)
		 ON CONFLICT(id) DO UPDATE SET cwd = excluded.cwd, completed = 1`,
	).run(id, cwd)
}

export function deleteMark(id: string): void {
	relaxDb().prepare(`DELETE FROM session_marks WHERE id = ?`).run(id)
}

/**
 * 基座这次没返回的 id 清掉标记。
 * 带 cwd 时只动这个 cwd 的行；不带则清全部对不上的行。
 */
export function dropMissingMarks(presentIds: string[], cwd?: string): void {
	const db = relaxDb()
	if (presentIds.length === 0) {
		if (cwd) db.prepare(`DELETE FROM session_marks WHERE cwd = ?`).run(cwd)
		else db.exec(`DELETE FROM session_marks`)
		return
	}
	const placeholders = presentIds.map(() => '?').join(', ')
	if (cwd) {
		db.prepare(`DELETE FROM session_marks WHERE cwd = ? AND id NOT IN (${placeholders})`).run(cwd, ...presentIds)
		return
	}
	db.prepare(`DELETE FROM session_marks WHERE id NOT IN (${placeholders})`).run(...presentIds)
}
