import type { CompletedMessage } from './types'
import { historyToMessages } from './historyMessages'

type Pending = {
	messages: readonly unknown[]
	resolve: (messages: CompletedMessage[]) => void
}

let worker: Worker | null = null
let broken = false
let seq = 0
const pending = new Map<number, Pending>()

function settleOnMain(items: readonly Pending[]) {
	for (const item of items) item.resolve(historyToMessages(item.messages))
}

function failWorker() {
	const left = [...pending.values()]
	pending.clear()
	worker?.terminate()
	worker = null
	broken = true
	settleOnMain(left)
}

function ensureWorker(): Worker | null {
	if (broken) return null
	if (worker) return worker
	try {
		worker = new Worker(new URL('./history.worker.ts', import.meta.url), { type: 'module' })
	} catch {
		broken = true
		return null
	}
	worker.addEventListener('message', (event: MessageEvent<{ id?: unknown; messages?: unknown }>) => {
		const id = event.data?.id
		if (typeof id !== 'number') return
		const item = pending.get(id)
		if (!item) return
		pending.delete(id)
		const messages = event.data.messages
		item.resolve(Array.isArray(messages) ? (messages as CompletedMessage[]) : historyToMessages(item.messages))
	})
	worker.addEventListener('error', () => {
		failWorker()
	})
	worker.addEventListener('messageerror', () => {
		failWorker()
	})
	return worker
}

function translateInWorker(messages: readonly unknown[]): Promise<CompletedMessage[]> {
	const current = ensureWorker()
	if (!current) return Promise.resolve(historyToMessages(messages))
	const id = ++seq
	return new Promise((resolve) => {
		pending.set(id, { messages, resolve })
		try {
			current.postMessage({ id, messages })
		} catch {
			pending.delete(id)
			resolve(historyToMessages(messages))
		}
	})
}

/** 译完后若代际已经变了，返回 null，调用方不要 replace。 */
export function translateHistory(
	messages: readonly unknown[],
	generation: number,
	currentGeneration: () => number,
): Promise<CompletedMessage[] | null> {
	return translateInWorker(messages).then((translated) => {
		if (currentGeneration() !== generation) return null
		return translated
	})
}
