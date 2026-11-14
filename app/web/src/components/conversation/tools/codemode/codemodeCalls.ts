export type NestedCallStatus = 'running' | 'ok' | 'error' | 'cancelled'

export type NestedCall = {
	id: string
	name: string
	args: string
	status: NestedCallStatus
	error?: string
}

const STATUSES = new Set<NestedCallStatus>(['running', 'ok', 'error', 'cancelled'])

/** `details.calls` 里能用来复用现有工具行的字段。没有结果正文。 */
export function readCodemodeCalls(details: unknown): NestedCall[] {
	if (typeof details !== 'object' || details === null || !('calls' in details)) return []
	const calls = (details as { calls?: unknown }).calls
	if (!Array.isArray(calls)) return []
	const out: NestedCall[] = []
	for (const call of calls) {
		if (typeof call !== 'object' || call === null) continue
		const item = call as Record<string, unknown>
		if (typeof item.name !== 'string' || item.name === '') continue
		const status = STATUSES.has(item.status as NestedCallStatus) ? (item.status as NestedCallStatus) : 'ok'
		out.push({
			id: typeof item.id === 'string' ? item.id : '',
			name: item.name,
			args: typeof item.args === 'string' ? item.args : '',
			status,
			...(typeof item.error === 'string' && item.error !== '' ? { error: item.error } : {}),
		})
	}
	return out
}
