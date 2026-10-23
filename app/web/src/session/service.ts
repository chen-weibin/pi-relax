import type { SessionRecord } from '../api/sessions/types'
import type { CatalogSession } from './catalogTypes'

/** 列表行收成目录。空名称留空字符串，未知状态视为 idle。 */
export function toCatalogSession(row: SessionRecord): CatalogSession {
	return {
		id: row.id,
		cwd: row.cwd,
		name: row.name ?? '',
		firstMessage: row.firstMessage ?? '',
		created: row.created,
		modified: row.modified,
		status: row.status === 'running' ? 'running' : 'idle',
	}
}

export function toCatalogSessions(rows: SessionRecord[]): CatalogSession[] {
	return rows.map(toCatalogSession)
}
