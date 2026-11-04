import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'

/** 助手失败文案。`null` 表示这条助手消息正常结束，提示清掉。`undefined` 表示这个事件跟提示无关。 */
export function assistantErrorFromEvent(event: AgentSessionEvent): string | null | undefined {
	if (event.type === 'message_update' && event.assistantMessageEvent.type === 'error') {
		const message = event.assistantMessageEvent.error.errorMessage
		return typeof message === 'string' && message !== '' ? message : '出错了'
	}
	if (event.type === 'message_end' && event.message.role === 'assistant') {
		const message = event.message.errorMessage
		return typeof message === 'string' && message !== '' ? message : null
	}
	return undefined
}
