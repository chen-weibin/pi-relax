import type { FsEntry, FsRead } from '../../extensions/contracts/fs'

/** 整文件进编辑器的上限。更大的文件仍会从接口读完，但不交给 Monaco。 */
export const TEXT_READ_LIMIT = 1_048_576

export type FsChangeEvent = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

export type FsChange = {
	event: FsChangeEvent
	path: string
}

const CHANGE_EVENTS = new Set<FsChangeEvent>(['add', 'change', 'unlink', 'addDir', 'unlinkDir'])

export function fsWebSocketUrl(apiBaseUrl: string): string {
	const wsBase = apiBaseUrl.replace(/\/$/, '').replace(/^http/i, 'ws')
	return new URL('/ws/fs', `${wsBase}/`).toString()
}

export function entriesFromList(body: unknown): FsEntry[] {
	if (!body || typeof body !== 'object' || !Array.isArray((body as { entries?: unknown }).entries)) {
		throw new Error('文件列表格式不对')
	}
	const entries: FsEntry[] = []
	for (const item of (body as { entries: unknown[] }).entries) {
		if (!item || typeof item !== 'object') continue
		const rec = item as { name?: unknown; path?: unknown; kind?: unknown }
		if (typeof rec.name !== 'string' || typeof rec.path !== 'string') continue
		if (rec.kind !== 'file' && rec.kind !== 'dir') continue
		entries.push({ name: rec.name, path: rec.path, kind: rec.kind })
	}
	return entries
}

export function classifyRead(input: { transfer: string | undefined; byteLength: number; bytes: Uint8Array }): FsRead {
	if (input.byteLength > TEXT_READ_LIMIT) return { kind: 'blocked', reason: '文件过大' }
	if (input.transfer === 'binary') return { kind: 'blocked', reason: '二进制文件' }
	return { kind: 'text', text: new TextDecoder().decode(input.bytes) }
}

export function textWriteConfig(path: string, text: string) {
	return {
		url: '/api/fs/file',
		params: { path },
		data: text,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'X-Relax-Transfer': 'text',
		},
	}
}

export function parentDir(path: string): string {
	const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path
	const slash = trimmed.lastIndexOf('/')
	if (slash <= 0) return '/'
	return trimmed.slice(0, slash)
}

export function listedParentsToRefresh(changes: readonly FsChange[], listed: ReadonlySet<string>): string[] {
	const parents = new Set<string>()
	for (const change of changes) {
		const parent = parentDir(change.path)
		if (listed.has(parent)) parents.add(parent)
	}
	return [...parents]
}

export function droppedCachePaths(cached: readonly string[], changes: readonly FsChange[]): string[] {
	const dead: string[] = []
	for (const change of changes) {
		if (change.event !== 'unlink' && change.event !== 'unlinkDir') continue
		const prefix = change.path.endsWith('/') ? change.path : `${change.path}/`
		for (const key of cached) {
			if (key === change.path || key.startsWith(prefix)) dead.push(key)
		}
	}
	return dead
}

export function eventsForOpenPath(path: string, changes: readonly FsChange[]): FsChangeEvent[] {
	const events: FsChangeEvent[] = []
	for (const change of changes) {
		if (change.path === path) {
			events.push(change.event)
			continue
		}
		if (change.event !== 'unlink' && change.event !== 'unlinkDir') continue
		const prefix = change.path.endsWith('/') ? change.path : `${change.path}/`
		if (path.startsWith(prefix)) events.push('unlink')
	}
	return events
}

export type FsServerMessage =
	| { type: 'watching'; path: string }
	| { type: 'change'; path: string; changes: FsChange[] }
	| { type: 'error'; path: string; message: string }

export function parseFsMessage(data: string): FsServerMessage | null {
	let message: unknown
	try {
		message = JSON.parse(data)
	} catch {
		return null
	}
	if (!message || typeof message !== 'object') return null
	const record = message as {
		type?: unknown
		path?: unknown
		changes?: unknown
		error?: { message?: unknown }
	}
	const path = typeof record.path === 'string' ? record.path : ''
	if (record.type === 'watching') return { type: 'watching', path }
	if (record.type === 'error') {
		const text = record.error && typeof record.error.message === 'string' ? record.error.message : '监听失败'
		return { type: 'error', path, message: text }
	}
	if (record.type !== 'change' || !Array.isArray(record.changes)) return null
	const changes: FsChange[] = []
	for (const item of record.changes) {
		if (!item || typeof item !== 'object') continue
		const rec = item as { event?: unknown; path?: unknown }
		if (typeof rec.path !== 'string' || typeof rec.event !== 'string') continue
		if (!CHANGE_EVENTS.has(rec.event as FsChangeEvent)) continue
		changes.push({ event: rec.event as FsChangeEvent, path: rec.path })
	}
	return { type: 'change', path, changes }
}
