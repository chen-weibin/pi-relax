import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { config } from '../../config'
import { parseSessionEvent } from './service'

export { parseSessionEvent }

export async function subscribeSessionEvents(options: {
	signal: AbortSignal
	onOpen: () => void
	onReconnecting: () => void
	onEvent: (sessionId: string, event: AgentSessionEvent) => void
	/** SSE `data` 原文。不传时连接行为与以前一样。 */
	onRaw?: (data: string) => void
}): Promise<void> {
	await fetchEventSource(`${config.apiBaseUrl}/api/sessions/events`, {
		signal: options.signal,
		openWhenHidden: true,
		async onopen(response) {
			const contentType = response.headers.get('content-type')
			if (!response.ok || !contentType?.startsWith(EventStreamContentType)) {
				throw new Error(`SSE failed: ${response.status}`)
			}
			options.onOpen()
		},
		onmessage(message) {
			if (!message.data) return
			options.onRaw?.(message.data)
			const parsed = parseSessionEvent(message.data)
			if (!parsed) return
			options.onEvent(parsed.sessionId, parsed.event)
		},
		onerror(error) {
			if (options.signal.aborted) throw error
			options.onReconnecting()
		},
	})
}
