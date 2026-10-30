import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { messageKey, userMessageText } from './historyMessages.ts'
import type { BlockFeedEvent } from './types'

function fromUpdate(event: Extract<AgentSessionEvent, { type: 'message_update' }>): BlockFeedEvent[] {
	const messageId = messageKey(event.message, 'live')
	const inner = event.assistantMessageEvent
	switch (inner.type) {
		case 'thinking_start':
		case 'text_start':
			return [{ type: inner.type, messageId, contentIndex: inner.contentIndex }]
		case 'thinking_delta':
		case 'text_delta':
			return [{ type: inner.type, messageId, contentIndex: inner.contentIndex, delta: inner.delta }]
		case 'thinking_end':
		case 'text_end':
			return [{ type: inner.type, messageId, contentIndex: inner.contentIndex, content: inner.content }]
		default:
			return []
	}
}

/** 当前会话要画的事件。工具、压缩和其它会话级通知先丢掉。 */
export function adaptAgentSession(event: AgentSessionEvent): BlockFeedEvent[] {
	if (event.type === 'agent_start') return [{ type: 'run_start' }]
	if (event.type === 'agent_settled') return [{ type: 'run_end' }]
	if (event.type === 'message_end' && event.message.role === 'user') {
		const text = userMessageText(event.message.content)
		if (!text) return []
		return [{ type: 'user', messageId: messageKey(event.message, 'live'), text }]
	}
	if (event.type === 'message_update') return fromUpdate(event)
	return []
}
