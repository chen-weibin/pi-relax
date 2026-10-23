import { existsSync } from 'node:fs'
import type { SessionManager } from '@earendil-works/pi-coding-agent'
import { messageText } from '../utils/text.js'
import { insertSession, legacyCompleted, listSessionRows, noteUserMessage, sessionKnown, type SessionRow } from './rows.js'
import { openSession } from './store.js'

function userMessages(manager: SessionManager): { timestamp: number; text: string }[] {
	return manager
		.buildSessionContext()
		.messages.filter((message) => message.role === 'user')
		.map((message) => ({ timestamp: message.timestamp, text: messageText(message) }))
}

/** 没有行才插入。逻辑删过的 id 不会因为文件还在被重新插入。 */
export function ensureSessionRow(manager: SessionManager): void {
	const id = manager.getSessionId()
	if (sessionKnown(id)) return
	const path = manager.getSessionFile()
	if (!path) return
	const created = manager.getHeader()?.timestamp ?? new Date().toISOString()
	const users = userMessages(manager)
	const last = users.reduce<{ timestamp: number } | undefined>(
		(latest, message) => (!latest || message.timestamp > latest.timestamp ? message : latest),
		undefined,
	)
	const titled = manager.getSessionName()?.trim() ?? ''
	const first = users[0]?.text.trim() ?? ''
	insertSession({
		id,
		cwd: manager.getCwd(),
		path,
		name: titled || first || null,
		created,
		modified: last ? new Date(last.timestamp).toISOString() : created,
		completed: legacyCompleted(id),
	})
}

/** 行已经在、标题还没写过，但文件里已经有用户消息。普通消息不会发 entry_appended，漏记的用这一次补上。 */
export function fillUnsetSessionNames(cwd?: string): void {
	for (const row of listSessionRows(cwd)) fillUnsetSessionName(row)
}

export function fillUnsetSessionName(row: SessionRow): void {
	if (row.name !== null || !existsSync(row.path)) return
	const users = userMessages(openSession(row.path))
	if (users.length === 0) return
	const last = users.reduce((latest, message) => (message.timestamp > latest.timestamp ? message : latest))
	noteUserMessage(row.id, new Date(last.timestamp).toISOString(), users[0]?.text ?? '')
}
