import type { PluginOpenResult } from '../../types'
import { pty } from '../../contracts/adapters/ptySocket'
import { currentExtensionCwd } from '../../sessionTabs'

export type TerminalPayload = {
	sessionId: string
}

export function isTerminalPayload(value: unknown): value is TerminalPayload {
	return Boolean(
		value &&
			typeof value === 'object' &&
			typeof (value as { sessionId?: unknown }).sessionId === 'string',
	)
}

export function createTerminalOpen(): PluginOpenResult {
	const sessionId = crypto.randomUUID()
	void pty.create({ id: sessionId, cwd: currentExtensionCwd() ?? undefined })
	return {
		title: '终端',
		reuseKey: `session:${sessionId}`,
		payload: { sessionId } satisfies TerminalPayload,
	}
}
