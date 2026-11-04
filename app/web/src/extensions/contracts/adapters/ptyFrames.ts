/** 断线后还去重连的时间，短于服务端 pty.graceMs（15000）。 */
export const RECONNECT_FOR_MS = 12_000

export const RETRY_DELAY_MS = 400

const STOP_CODES = new Set([4000, 4010, 4400, 4404, 4429])

export type PtyQuery = {
	cwd?: string
	id?: string
	cols?: number
	rows?: number
}

export type PtyInbound =
	| { kind: 'ready'; id: string; replay?: string }
	| { kind: 'output'; text: string }
	| { kind: 'notice'; text: string }
	| { kind: 'ignore' }

export function ptyWebSocketUrl(apiBaseUrl: string, query: PtyQuery): string {
	const wsBase = apiBaseUrl.replace(/\/$/, '').replace(/^http/i, 'ws')
	const url = new URL('/ws/pty', `${wsBase}/`)
	if (query.cwd) url.searchParams.set('cwd', query.cwd)
	if (query.id) url.searchParams.set('id', query.id)
	if (query.cols) url.searchParams.set('cols', String(query.cols))
	if (query.rows) url.searchParams.set('rows', String(query.rows))
	return url.toString()
}

export function decodePtyData(data: string | ArrayBuffer, decoder: TextDecoder): PtyInbound {
	if (typeof data !== 'string') {
		const text = decoder.decode(new Uint8Array(data), { stream: true })
		return text ? { kind: 'output', text } : { kind: 'ignore' }
	}
	let message: unknown
	try {
		message = JSON.parse(data)
	} catch {
		return { kind: 'ignore' }
	}
	if (!message || typeof message !== 'object') return { kind: 'ignore' }
	const record = message as {
		type?: unknown
		id?: unknown
		replay?: unknown
		error?: { message?: unknown }
	}
	if (record.type === 'ready' && typeof record.id === 'string') {
		return typeof record.replay === 'string'
			? { kind: 'ready', id: record.id, replay: record.replay }
			: { kind: 'ready', id: record.id }
	}
	if (record.type === 'error') {
		const text = record.error && typeof record.error.message === 'string' ? record.error.message : '终端出错'
		return { kind: 'notice', text }
	}
	return { kind: 'ignore' }
}

export function shouldReconnectPty(input: {
	userClosed: boolean
	code: number
	serverId: string | null
	now: number
	retryUntil: number
}): { retry: boolean; retryUntil: number } {
	if (input.userClosed || !input.serverId || STOP_CODES.has(input.code)) {
		return { retry: false, retryUntil: 0 }
	}
	const until = input.retryUntil || input.now + RECONNECT_FOR_MS
	if (input.now > until) return { retry: false, retryUntil: 0 }
	return { retry: true, retryUntil: until }
}
