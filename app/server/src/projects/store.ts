import { randomUUID } from 'node:crypto'
import { realpath, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { relaxDb } from '../db/connection.js'
import { requireAbsolutePath } from '../fs/ops.js'
import { HttpError } from '../utils/errors.js'
import { timeInRange, type PageWindow } from '../utils/query.js'

export type ProjectRecord = {
	id: string
	cwd: string
	name: string
	position: number
	created: string
	modified: string
}

type ProjectRow = {
	id: string
	cwd: string
	name: string
	position: number | null
	created: string
	modified: string
	deleted_at: string | null
}

export type ProjectTimeFilter = { createdFrom?: string; createdTo?: string }

/** 绝对路径、目录必须已存在。存 realpath。 */
export async function resolveProjectCwd(value: unknown): Promise<string> {
	const absolute = requireAbsolutePath(value)
	let resolved: string
	try {
		resolved = await realpath(absolute)
	} catch {
		throw new HttpError(400, 'BAD_REQUEST', 'cwd must be an existing directory')
	}
	const info = await stat(resolved)
	if (!info.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', 'cwd must be an existing directory')
	return resolved
}

function rows(): ProjectRow[] {
	return relaxDb()
		.prepare(
			`SELECT id, cwd, name, position, created, modified, deleted_at
			 FROM projects WHERE deleted_at IS NULL ORDER BY position DESC`,
		)
		.all() as ProjectRow[]
}

function toRecord(row: ProjectRow): ProjectRecord {
	return {
		id: row.id,
		cwd: row.cwd,
		name: row.name,
		position: row.position ?? 0,
		created: row.created,
		modified: row.modified,
	}
}

function activeFiltered(filter: ProjectTimeFilter): ProjectRecord[] {
	return rows()
		.filter((row) => timeInRange(row.created, filter.createdFrom, filter.createdTo))
		.map(toRecord)
}

function nextPosition(): number {
	const row = relaxDb()
		.prepare(`SELECT MAX(position) AS max_position FROM projects WHERE deleted_at IS NULL`)
		.get() as { max_position: number | null }
	return (row.max_position ?? 0) + 1
}

function findByCwd(cwd: string): ProjectRow | undefined {
	return relaxDb().prepare(`SELECT * FROM projects WHERE cwd = ?`).get(cwd) as ProjectRow | undefined
}

function findById(id: string): ProjectRow | undefined {
	return relaxDb().prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as ProjectRow | undefined
}

/** 未软删除的一行。没有或已软删除则 undefined。 */
export function getProject(id: string): ProjectRecord | undefined {
	const row = findById(id)
	if (!row || row.deleted_at) return undefined
	return toRecord(row)
}

/** 行还在就返回，含已软删除。物理删除之后才是 undefined。 */
export function getProjectRow(id: string): ProjectRecord | undefined {
	const row = findById(id)
	if (!row) return undefined
	return toRecord(row)
}

export function projectCwd(id: string): string | undefined {
	return findById(id)?.cwd
}

export function countProjects(filter: ProjectTimeFilter): number {
	return activeFiltered(filter).length
}

export function listProjects(filter: ProjectTimeFilter, page?: PageWindow): { projects: ProjectRecord[]; total: number } {
	const matched = activeFiltered(filter)
	const projects = page ? matched.slice(page.offset, page.offset + page.limit) : matched
	return { projects, total: matched.length }
}

function insertProject(cwd: string, name: string): ProjectRecord {
	const now = new Date().toISOString()
	const id = randomUUID()
	relaxDb()
		.prepare(
			`INSERT INTO projects (id, cwd, name, position, created, modified, deleted_at)
			 VALUES (?, ?, ?, ?, ?, ?, NULL)`,
		)
		.run(id, cwd, name, nextPosition(), now, now)
	return getProject(id)!
}

export function createProject(cwd: string, name?: string): ProjectRecord {
	const display = name?.trim() ? name.trim() : basename(cwd)
	if (!display) throw new HttpError(400, 'BAD_REQUEST', 'name must not be empty')
	const now = new Date().toISOString()
	const db = relaxDb()
	const existing = findByCwd(cwd)
	if (existing && !existing.deleted_at) {
		throw new HttpError(409, 'ALREADY_EXISTS', 'project already registered')
	}
	if (existing) {
		db.prepare(
			`UPDATE projects SET name = ?, position = ?, modified = ?, deleted_at = NULL WHERE id = ?`,
		).run(name?.trim() ? name.trim() : existing.name, nextPosition(), now, existing.id)
		return getProject(existing.id)!
	}
	return insertProject(cwd, display)
}

/** 新建会话时补登记。已有行（含已软删除）不改。 */
export function ensureProject(cwd: string): void {
	if (findByCwd(cwd)) return
	const name = basename(cwd)
	if (!name) return
	insertProject(cwd, name)
}

export function renameProject(id: string, name: string): ProjectRecord {
	const trimmed = name.trim()
	if (!trimmed) throw new HttpError(400, 'BAD_REQUEST', 'name must not be empty')
	const row = findById(id)
	if (!row || row.deleted_at) throw new HttpError(404, 'NOT_FOUND', `Project not found: ${id}`)
	relaxDb()
		.prepare(`UPDATE projects SET name = ?, modified = ? WHERE id = ?`)
		.run(trimmed, new Date().toISOString(), id)
	return getProject(id)!
}

export function moveProject(id: string, index: number): ProjectRecord {
	const ordered = rows()
	const from = ordered.findIndex((row) => row.id === id)
	if (from < 0) throw new HttpError(404, 'NOT_FOUND', `Project not found: ${id}`)
	if (!Number.isInteger(index) || index < 0 || index >= ordered.length) {
		throw new HttpError(400, 'BAD_REQUEST', 'index is out of range')
	}
	const moved = ordered[from]
	if (!moved) throw new HttpError(404, 'NOT_FOUND', `Project not found: ${id}`)
	ordered.splice(from, 1)
	ordered.splice(index, 0, moved)
	const db = relaxDb()
	const clear = db.prepare(`UPDATE projects SET position = NULL WHERE deleted_at IS NULL`)
	const write = db.prepare(`UPDATE projects SET position = ? WHERE id = ?`)
	const touch = db.prepare(`UPDATE projects SET modified = ? WHERE id = ?`)
	const now = new Date().toISOString()
	const count = ordered.length
	db.exec('BEGIN')
	try {
		clear.run()
		ordered.forEach((row, place) => write.run(count - place, row.id))
		touch.run(now, id)
		db.exec('COMMIT')
	} catch (error) {
		db.exec('ROLLBACK')
		throw error
	}
	return getProject(id)!
}

export function softDeleteProject(id: string): void {
	const row = findById(id)
	if (!row || row.deleted_at) throw new HttpError(404, 'NOT_FOUND', `Project not found: ${id}`)
	relaxDb()
		.prepare(`UPDATE projects SET deleted_at = ?, position = NULL, modified = ? WHERE id = ?`)
		.run(new Date().toISOString(), new Date().toISOString(), id)
}

export function hardDeleteProject(id: string): void {
	const row = findById(id)
	if (!row) throw new HttpError(404, 'NOT_FOUND', `Project not found: ${id}`)
	relaxDb().prepare(`DELETE FROM projects WHERE id = ?`).run(id)
}
