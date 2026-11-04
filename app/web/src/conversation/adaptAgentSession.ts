import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { messageKey, userMessageText } from './historyMessages.ts'
import { formatToolArguments, toolResultText } from './toolText.ts'
import type { BlockFeedEvent } from './types'

function partialText(
	partial: { content: readonly { type: string; text?: string; thinking?: string }[] },
	index: number,
	type: 'text' | 'thinking',
): string | undefined {
	const part = partial.content[index]
	if (!part || part.type !== type) return undefined
	const text = type === 'text' ? part.text : part.thinking
	return typeof text === 'string' && text.length > 0 ? text : undefined
}

function toolFields(
	partial: { content: readonly { type: string; id?: string; name?: string }[] },
	index: number,
): { toolCallId?: string; name?: string } {
	const part = partial.content[index]
	if (!part || part.type !== 'toolCall') return {}
	return {
		...(typeof part.id === 'string' && part.id ? { toolCallId: part.id } : {}),
		...(typeof part.name === 'string' && part.name ? { name: part.name } : {}),
	}
}

function fromUpdate(event: Extract<AgentSessionEvent, { type: 'message_update' }>): BlockFeedEvent[] {
	const messageId = messageKey(event.message, 'live')
	const inner = event.assistantMessageEvent
	switch (inner.type) {
		case 'thinking_start':
		case 'text_start':
			return [{ type: inner.type, messageId, contentIndex: inner.contentIndex }]
		case 'thinking_delta':
		case 'text_delta': {
			const content = partialText(inner.partial, inner.contentIndex, inner.type === 'text_delta' ? 'text' : 'thinking')
			return [
				{
					type: inner.type,
					messageId,
					contentIndex: inner.contentIndex,
					delta: inner.delta,
					...(content !== undefined ? { content } : {}),
				},
			]
		}
		case 'thinking_end':
		case 'text_end':
			return [{ type: inner.type, messageId, contentIndex: inner.contentIndex, content: inner.content }]
		case 'toolcall_start':
			return [{ type: 'tool_start', messageId, contentIndex: inner.contentIndex, ...toolFields(inner.partial, inner.contentIndex) }]
		case 'toolcall_delta':
			return [
				{
					type: 'tool_delta',
					messageId,
					contentIndex: inner.contentIndex,
					delta: inner.delta,
					...toolFields(inner.partial, inner.contentIndex),
				},
			]
		case 'toolcall_end':
			return [
				{
					type: 'tool_end',
					messageId,
					contentIndex: inner.contentIndex,
					toolCallId: inner.toolCall.id,
					name: inner.toolCall.name,
					argumentsText: formatToolArguments(inner.toolCall.arguments, inner.toolCall.argumentsError),
				},
			]
		default:
			return []
	}
}

/** 当前会话要画的事件。压缩和其它会话级通知先丢掉。助手错误不进块，走输入框上方。 */
export function adaptAgentSession(event: AgentSessionEvent): BlockFeedEvent[] {
	if (event.type === 'agent_start') return [{ type: 'run_start' }]
	if (event.type === 'agent_settled') return [{ type: 'run_end' }]
	if (event.type === 'message_end' && event.message.role === 'user') {
		const text = userMessageText(event.message.content)
		if (!text) return []
		return [{ type: 'user', messageId: messageKey(event.message, 'live'), text }]
	}
	if (event.type === 'message_end' && event.message.role === 'toolResult') {
		return [
			{
				type: 'tool_result',
				toolCallId: event.message.toolCallId,
				name: event.message.toolName,
				resultText: toolResultText(event.message.content),
				isError: event.message.isError,
				done: true,
			},
		]
	}
	if (event.type === 'tool_execution_start') {
		return [{ type: 'tool_run', toolCallId: event.toolCallId, name: event.toolName }]
	}
	if (event.type === 'tool_execution_update') {
		return [
			{
				type: 'tool_result',
				toolCallId: event.toolCallId,
				name: event.toolName,
				resultText: toolResultText(event.partialResult),
				done: false,
			},
		]
	}
	if (event.type === 'tool_execution_end') {
		return [
			{
				type: 'tool_result',
				toolCallId: event.toolCallId,
				name: event.toolName,
				resultText: toolResultText(event.result),
				isError: event.isError,
				done: true,
			},
		]
	}
	if (event.type === 'message_update') return fromUpdate(event)
	return []
}
