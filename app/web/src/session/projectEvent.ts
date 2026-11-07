import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { adaptAgentSession } from '../conversation/adaptAgentSession.ts'
import { assistantErrorFromEvent } from '../conversation/assistantError.ts'
import type { BlockFeedEvent } from '../conversation/types.ts'
import { noteCatalogEvent, type CatalogNote, type UnseenRun } from './catalogEvent.ts'

export type LiveFrame = {
	blocks: BlockFeedEvent[]
	assistantError: string | null | undefined
}

export type ProjectedEvent = LiveFrame & {
	catalog: CatalogNote
	draft: 'keep' | 'clear' | 'set'
	message?: unknown
}

/** 一条 SSE 只读一次：块、输入框错误、目录备注、还在写的半截。 */
export function projectAgentEvent(event: AgentSessionEvent, pending: UnseenRun | null, viewing: boolean): ProjectedEvent {
	let draft: ProjectedEvent['draft'] = 'keep'
	let message: unknown
	if (event.type === 'message_update' && event.message.role === 'assistant') {
		draft = 'set'
		message = event.message
	} else if (event.type === 'agent_settled') {
		draft = 'clear'
	}
	return {
		blocks: adaptAgentSession(event),
		assistantError: assistantErrorFromEvent(event),
		catalog: noteCatalogEvent(pending, event, viewing),
		draft,
		message,
	}
}
