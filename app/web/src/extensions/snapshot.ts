export type TerminalSnapshotTab = {
	id: string
	title: string
	reuseKey: string
	sessionId: string
}

export type FileSnapshotTab = {
	id: string
	reuseKey: string
	path: string
}

export type ExplorerSnapshotTab = {
	id: string
	reuseKey: string
}

export type SnapshotTab = TerminalSnapshotTab | FileSnapshotTab | ExplorerSnapshotTab

export type ExtensionSnapshot = {
	cwd: string
	extensionOpen: boolean
	activeTabId: string | null
	tabs: SnapshotTab[]
}

type TabLike = {
	id: string
	pluginId: string
	title: string
	reuseKey: string
	payload?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function sessionIdOf(payload: unknown): string | null {
	if (!isRecord(payload)) return null
	const sessionId = payload.sessionId
	return typeof sessionId === 'string' && sessionId ? sessionId : null
}

function filePathOf(tab: TabLike): string | null {
	if (tab.pluginId !== 'files' || !isRecord(tab.payload)) return null
	if (tab.payload.kind === 'explorer') return null
	const path = tab.payload.path
	return typeof path === 'string' && path ? path : null
}

function isExplorerTab(tab: TabLike): boolean {
	if (tab.pluginId !== 'files') return false
	if (tab.reuseKey === 'explorer') return true
	return isRecord(tab.payload) && tab.payload.kind === 'explorer'
}

export function captureTerminalSnapshot(
	tabs: TabLike[],
	extensionOpen: boolean,
	cwd: string,
	activeTabId: string | null,
): ExtensionSnapshot {
	const kept: SnapshotTab[] = []
	for (const tab of tabs) {
		const sessionId = tab.pluginId === 'terminal' ? sessionIdOf(tab.payload) : null
		if (sessionId) {
			kept.push({
				id: tab.id,
				title: tab.title || '终端',
				reuseKey: tab.reuseKey || `session:${sessionId}`,
				sessionId,
			})
			continue
		}
		const path = filePathOf(tab)
		if (path) {
			kept.push({
				id: tab.id,
				reuseKey: tab.reuseKey || `file:${path}`,
				path,
			})
			continue
		}
		if (isExplorerTab(tab)) {
			kept.push({ id: tab.id, reuseKey: 'explorer' })
		}
	}
	const active = kept.some((tab) => tab.id === activeTabId) ? activeTabId : (kept[0]?.id ?? null)
	return { cwd, extensionOpen, activeTabId: active, tabs: kept }
}

export function moveExtensionKey(
	book: Record<string, ExtensionSnapshot>,
	from: string,
	to: string,
): Record<string, ExtensionSnapshot> {
	if (!from || !to || from === to || !book[from]) return book
	const next = { ...book, [to]: book[from] }
	delete next[from]
	return next
}

export function readExtensionBook(value: unknown): Record<string, ExtensionSnapshot> {
	if (!isRecord(value)) return {}
	const book: Record<string, ExtensionSnapshot> = {}
	for (const [key, entry] of Object.entries(value)) {
		if (!key) continue
		const snapshot = readExtensionSnapshot(entry)
		if (snapshot) book[key] = snapshot
	}
	return book
}

function readSnapshotTab(item: unknown): SnapshotTab | null {
	if (!isRecord(item) || typeof item.id !== 'string' || !item.id) return null
	if (typeof item.sessionId === 'string' && item.sessionId) {
		return {
			id: item.id,
			title: typeof item.title === 'string' && item.title ? item.title : '终端',
			reuseKey: typeof item.reuseKey === 'string' && item.reuseKey ? item.reuseKey : `session:${item.sessionId}`,
			sessionId: item.sessionId,
		}
	}
	if (typeof item.path === 'string' && item.path) {
		return {
			id: item.id,
			reuseKey: typeof item.reuseKey === 'string' && item.reuseKey ? item.reuseKey : `file:${item.path}`,
			path: item.path,
		}
	}
	if (item.reuseKey === 'explorer') return { id: item.id, reuseKey: 'explorer' }
	return null
}

function readExtensionSnapshot(value: unknown): ExtensionSnapshot | null {
	if (!isRecord(value) || typeof value.cwd !== 'string' || !value.cwd) return null
	const tabs: SnapshotTab[] = []
	if (Array.isArray(value.tabs)) {
		for (const item of value.tabs) {
			const tab = readSnapshotTab(item)
			if (tab) tabs.push(tab)
		}
	}
	const requested = typeof value.activeTabId === 'string' ? value.activeTabId : null
	const activeTabId = tabs.some((tab) => tab.id === requested) ? requested : (tabs[0]?.id ?? null)
	return {
		cwd: value.cwd,
		extensionOpen: value.extensionOpen === true,
		activeTabId,
		tabs,
	}
}
