import type { PluginOpenResult } from '../../types'
import { mockPty } from '../../contracts/adapters/mock'

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
	void mockPty.create({ id: sessionId })
	return {
		title: 'zsh',
		reuseKey: `session:${sessionId}`,
		payload: { sessionId } satisfies TerminalPayload,
	}
}
