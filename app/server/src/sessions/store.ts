import { unlinkSync } from 'node:fs'
import { SessionManager, type SessionInfo } from '@earendil-works/pi-coding-agent'
import { ensureRelaxHome, getDefaultWorkspace } from '../config/home.js'
import { messageText } from '../utils/text.js'
import type { SessionHistory, SessionRecord, SessionStatus } from './types.js'

function toRecord(info: SessionInfo, status: SessionStatus): SessionRecord {
	const { path: _path, allMessagesText: _all, created, modified, ...rest } = info
	return {
		...rest,
		created: created.toISOString(),
		modified: modified.toISOString(),
		status,
	}
}

/** 把尚未落盘的会话拼成列表项。 */
export function recordFromManager(manager: SessionManager, status: SessionStatus): SessionRecord {
	const header = manager.getHeader()
	const context = manager.buildSessionContext()
	const firstUser = context.messages.find((message) => message.role === 'user')
	const created = header?.timestamp ? new Date(header.timestamp) : new Date()
	const messageCount = context.messages.filter(
		(message) => message.role === 'user' || message.role === 'assistant',
	).length
	return {
		id: manager.getSessionId(),
		cwd: manager.getCwd(),
		name: manager.getSessionName(),
		parentSessionPath: header?.parentSession,
		created: created.toISOString(),
		modified: new Date().toISOString(),
		messageCount,
		firstMessage: firstUser ? messageText(firstUser) || '(no messages)' : '(no messages)',
		status,
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
