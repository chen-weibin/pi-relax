import { unlinkSync } from 'node:fs'
import { SessionManager, type SessionInfo } from '@earendil-works/pi-coding-agent'
import { ensureRelaxHome, getDefaultWorkspace } from '../config/home.js'
import type { SessionHistory, SessionRecord, SessionStatus } from './types.js'

/** 磁盘扫描用。列表接口不走这里，modified 也不再在这里现算。 */
function toRecord(info: SessionInfo, status: SessionStatus): SessionRecord {
	return {
		id: info.id,
		cwd: info.cwd,
		name: info.name ?? '',
		created: info.created.toISOString(),
		modified: info.modified.toISOString(),
		status,
		completed: false,
	}
}

/** 未指定工作区时用的默认目录。 */
export function defaultCwd(): string {
	return getDefaultWorkspace()
}

/** 把磁盘上的会话信息转成对外记录。 */
export function recordFromInfo(info: SessionInfo, status: SessionStatus): SessionRecord {
	return toRecord(info, status)
}

/** 列出磁盘上的会话；可选按工作区过滤。 */
export async function listSessions(cwd?: string): Promise<SessionRecord[]> {
	ensureRelaxHome()
	const infos = cwd ? await SessionManager.list(cwd) : await SessionManager.listAll()
	return infos.map((info) => toRecord(info, 'idle'))
}

/** 按 id 查找磁盘上的会话。 */
export async function findSessionInfo(id: string): Promise<SessionInfo | undefined> {
	ensureRelaxHome()
	const infos = await SessionManager.listAll()
	return infos.find((info) => info.id === id)
}

/** 打开已有会话文件。 */
export function openSession(path: string): SessionManager {
	ensureRelaxHome()
	return SessionManager.open(path)
}

/** 新建一条会话（此时通常还没有文件）。 */
export function createSessionManager(cwd: string): SessionManager {
	ensureRelaxHome()
	return SessionManager.create(cwd)
}

/** 取出可渲染的对话上下文。 */
export function historyFrom(manager: SessionManager): SessionHistory {
	return manager.buildSessionContext()
}

/** 按 id 读取历史；找不到则返回 undefined。 */
export async function historyById(id: string): Promise<SessionHistory | undefined> {
	const info = await findSessionInfo(id)
	if (!info) return undefined
	return historyFrom(openSession(info.path))
}

/** 删除会话文件。找不到返回 false。 */
export async function deleteSessionFile(id: string): Promise<boolean> {
	const info = await findSessionInfo(id)
	if (!info) return false
	unlinkSync(info.path)
	return true
}
