import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { getRelaxAgentDir } from '../config/home.js'
import { ensureSessionRow } from './index-row.js'
import { listSessionRows, sessionKnown, softDeleteSession } from './rows.js'
import { openSession } from './store.js'

function sessionDir(cwd: string): string {
	const safe = `--${resolve(cwd).replace(/^[/\\]/, '').replace(/[/\\:]/g, '-')}--`
	return join(getRelaxAgentDir(), 'sessions', safe)
}

function jsonlFiles(dir: string): string[] {
	if (!existsSync(dir)) return []
	const found: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) found.push(...jsonlFiles(path))
		else if (entry.isFile() && entry.name.endsWith('.jsonl')) found.push(path)
	}
	return found
}

function idInName(file: string): string | undefined {
	const base = file.slice(file.lastIndexOf('/') + 1, -'.jsonl'.length)
	const split = base.lastIndexOf('_')
	if (split < 0) return undefined
	return base.slice(split + 1)
}

/** 目录里还没有行的 JSONL 补进表。已经有行的（含逻辑删）不重读、不复活。 */
export function backfillSessions(cwd?: string): void {
	const root = cwd ? sessionDir(cwd) : join(getRelaxAgentDir(), 'sessions')
	for (const file of jsonlFiles(root)) {
		const hinted = idInName(file)
		if (hinted && sessionKnown(hinted)) continue
		const manager = openSession(file)
		if (sessionKnown(manager.getSessionId())) continue
		ensureSessionRow(manager)
	}
}

/** 行还在、文件已经没了，就逻辑删。还没写出文件的热会话留着。 */
export function dropMissingSessionFiles(cwd: string | undefined, awaitingFile: (id: string) => boolean): void {
	for (const row of listSessionRows(cwd)) {
		if (existsSync(row.path) || awaitingFile(row.id)) continue
		softDeleteSession(row.id)
	}
}
