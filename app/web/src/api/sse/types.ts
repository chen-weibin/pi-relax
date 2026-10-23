import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'

export type { AgentSessionEvent }

export type SessionEventEnvelope = {
	sessionId: string
	event: AgentSessionEvent
}
