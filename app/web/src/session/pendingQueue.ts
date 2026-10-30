export type PendingMessage = {
	id: string
	text: string
}

export function enqueue(items: readonly PendingMessage[], item: PendingMessage): PendingMessage[] {
	return [...items, item]
}

export function removePending(items: readonly PendingMessage[], id: string): PendingMessage[] {
	return items.filter((item) => item.id !== id)
}

export function takeHead(
	items: readonly PendingMessage[],
): { head: PendingMessage; rest: PendingMessage[] } | null {
	const head = items[0]
	if (!head) return null
	return { head, rest: items.slice(1) }
}
