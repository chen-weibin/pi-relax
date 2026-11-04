export type TerminalSnapshotTab = {
	id: string
	title: string
	reuseKey: string
	sessionId: string
}

export type ExtensionSnapshot = {
	cwd: string
	extensionOpen: boolean
	activeTabId: string | null
	tabs: TerminalSnapshotTab[]
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

export function captureTerminalSnapshot(
	tabs: TabLike[],
	extensionOpen: boolean,
	cwd: string,
	activeTabId: string | null,
): ExtensionSnapshot {
	const kept: TerminalSnapshotTab[] = []
	for (const tab of tabs) {
		if (tab.pluginId !== 'terminal') continue
		const sessionId = sessionIdOf(tab.payload)
		if (!sessionId) continue
		kept.push({
			id: tab.id,
			title: tab.title || '终端',
			reuseKey: tab.reuseKey || `session:${sessionId}`,
			sessionId,
		})
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

function readExtensionSnapshot(value: unknown): ExtensionSnapshot | null {
	if (!isRecord(value) || typeof value.cwd !== 'string' || !value.cwd) return null
	const tabs: TerminalSnapshotTab[] = []
	if (Array.isArray(value.tabs)) {
		for (const item of value.tabs) {
			if (!isRecord(item) || typeof item.id !== 'string' || !item.id) continue
			if (typeof item.sessionId !== 'string' || !item.sessionId) continue
			tabs.push({
				id: item.id,
				title: typeof item.title === 'string' && item.title ? item.title : '终端',
				reuseKey:
					typeof item.reuseKey === 'string' && item.reuseKey ? item.reuseKey : `session:${item.sessionId}`,
				sessionId: item.sessionId,
			})
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
