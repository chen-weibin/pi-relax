export type TerminalSessionInfo = {
	sessionId: string
	tabId: string
	title: string
	active: boolean
}

type TabLike = {
	id: string
	pluginId: string
	title: string
	payload?: unknown
}

export function shellInput(command: string): string {
	if (command.endsWith('\n') || command.endsWith('\r')) return command
	return `${command}\r`
}

function sessionIdOf(payload: unknown): string | null {
	if (!payload || typeof payload !== 'object') return null
	const sessionId = (payload as { sessionId?: unknown }).sessionId
	return typeof sessionId === 'string' && sessionId ? sessionId : null
}

export function listOpenTerminals(
	tabs: readonly TabLike[],
	activeTabId: string | null,
): TerminalSessionInfo[] {
	const sessions: TerminalSessionInfo[] = []
	for (const tab of tabs) {
		if (tab.pluginId !== 'terminal') continue
		const sessionId = sessionIdOf(tab.payload)
		if (!sessionId) continue
		sessions.push({
			sessionId,
			tabId: tab.id,
			title: tab.title,
			active: tab.id === activeTabId,
		})
	}
	return sessions
}
