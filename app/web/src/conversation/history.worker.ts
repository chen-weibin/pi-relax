import { historyToMessages } from './historyMessages'

type Request = { id: number; messages: unknown }

interface HistoryWorkerScope {
	onmessage: ((event: MessageEvent<Request>) => void) | null
	postMessage(message: unknown): void
}

const scope = globalThis as unknown as HistoryWorkerScope

scope.onmessage = (event) => {
	const { id, messages } = event.data
	const list = Array.isArray(messages) ? messages : []
	scope.postMessage({ id, messages: historyToMessages(list) })
}
