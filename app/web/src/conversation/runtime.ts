import type {
	BlockFeedEvent,
	BlockSnapshot,
	CompletedMessage,
	ConversationSnapshot,
	MessageSnapshot,
	Publication,
	RunPhase,
	TextBlock,
	ThinkingBlock,
	UserTextBlock,
} from './types'

const EMPTY_SNAPSHOT: ConversationSnapshot = {
	revision: 0,
	order: [],
	byKey: {},
	messageOrder: [],
	messages: {},
	runPhase: 'idle',
}

function blockKey(messageId: string, contentIndex: number, kind: 'thinking' | 'text'): string {
	return `${messageId}:${contentIndex}:${kind}`
}

function userKey(messageId: string): string {
	return `${messageId}:user`
}

function publicationOf(event: BlockFeedEvent): Publication {
	switch (event.type) {
		case 'thinking_delta':
		case 'text_delta':
			return 'animation-frame'
		case 'run_start':
		case 'run_end':
		case 'run_error':
		case 'user':
		case 'thinking_start':
		case 'thinking_end':
		case 'text_start':
		case 'text_end':
			return 'immediate'
		default: {
			const _exhaustive: never = event
			return _exhaustive
		}
	}
}

function sameBlock(prev: BlockSnapshot, next: BlockSnapshot): boolean {
	if (prev.kind !== next.kind || prev.contentPhase !== next.contentPhase) return false
	switch (next.kind) {
		case 'user-text':
			return prev.kind === 'user-text' && prev.data.text === next.data.text
		case 'thinking':
			return prev.kind === 'thinking' && prev.data.text === next.data.text
		case 'text':
			return prev.kind === 'text' && prev.data.text === next.data.text
		default: {
			const _exhaustive: never = next
			return _exhaustive
		}
	}
}

function roleOf(block: BlockSnapshot): MessageSnapshot['role'] {
	return block.kind === 'user-text' ? 'user' : 'assistant'
}

function buildMessages(order: readonly string[], blocks: Map<string, BlockSnapshot>) {
	const messageOrder: string[] = []
	const messages: Record<string, MessageSnapshot> = {}
	for (const key of order) {
		const block = blocks.get(key)
		if (!block) continue
		const existing = messages[block.messageId]
		if (!existing) {
			messageOrder.push(block.messageId)
			messages[block.messageId] = {
				id: block.messageId,
				role: roleOf(block),
				blockKeys: [key],
			}
			continue
		}
		messages[block.messageId] = {
			...existing,
			blockKeys: [...existing.blockKeys, key],
		}
	}
	return { messageOrder, messages }
}

function textOf(block: BlockSnapshot | undefined): string {
	if (!block) return ''
	switch (block.kind) {
		case 'user-text':
		case 'thinking':
		case 'text':
			return block.data.text
		default: {
			const _exhaustive: never = block
			return _exhaustive
		}
	}
}

export type BlockRuntime = {
	apply: (event: BlockFeedEvent) => void
	replace: (messages: CompletedMessage[]) => void
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => ConversationSnapshot
}

export function createBlockRuntime(): BlockRuntime {
	let order: string[] = []
	const blocks = new Map<string, BlockSnapshot>()
	const listeners = new Set<() => void>()
	let pending: BlockFeedEvent[] = []
	let raf = 0
	let revision = 0
	let runPhase: RunPhase = 'idle'
	let snapshot: ConversationSnapshot = EMPTY_SNAPSHOT
	let structural = false
	let dirty: string[] = []

	const noteInsert = () => {
		structural = true
	}

	const noteUpdate = (key: string) => {
		dirty.push(key)
	}

	const resetTouch = () => {
		structural = false
		dirty = []
	}

	const emit = () => {
		if (!structural && dirty.length === 0 && runPhase === snapshot.runPhase) return
		revision += 1
		if (!structural) {
			const byKey = dirty.length === 0 ? snapshot.byKey : { ...snapshot.byKey }
			if (dirty.length > 0) {
				const next = byKey as Record<string, BlockSnapshot>
				for (const key of dirty) {
					const block = blocks.get(key)
					if (block) next[key] = block
				}
			}
			snapshot = {
				revision,
				order,
				byKey,
				messageOrder: snapshot.messageOrder,
				messages: snapshot.messages,
				runPhase,
			}
		} else {
			const nextByKey: Record<string, BlockSnapshot> = {}
			for (const key of order) {
				const block = blocks.get(key)
				if (block) nextByKey[key] = block
			}
			const grouped = buildMessages(order, blocks)
			snapshot = {
				revision,
				order,
				byKey: nextByKey,
				messageOrder: grouped.messageOrder,
				messages: grouped.messages,
				runPhase,
			}
		}
		for (const listener of listeners) listener()
	}

	const upsert = (block: BlockSnapshot) => {
		const prev = blocks.get(block.key)
		if (!prev) {
			order = [...order, block.key]
			blocks.set(block.key, block)
			noteInsert()
			return
		}
		if (sameBlock(prev, block)) return
		blocks.set(block.key, block)
		noteUpdate(block.key)
	}

	const applyOne = (event: BlockFeedEvent) => {
		switch (event.type) {
			case 'run_start':
				runPhase = 'awaiting'
				return
			case 'run_end':
				runPhase = 'complete'
				for (const block of blocks.values()) {
					if (block.contentPhase !== 'open') continue
					blocks.set(block.key, { ...block, contentPhase: 'complete' })
					noteUpdate(block.key)
				}
				return
			case 'run_error':
				runPhase = 'error'
				return
			case 'user': {
				const block: UserTextBlock = {
					key: userKey(event.messageId),
					kind: 'user-text',
					data: { text: event.text },
					contentPhase: 'complete',
					messageId: event.messageId,
				}
				upsert(block)
				if (runPhase === 'running' || runPhase === 'awaiting') runPhase = 'awaiting'
				return
			}
			case 'thinking_start': {
				const block: ThinkingBlock = {
					key: blockKey(event.messageId, event.contentIndex, 'thinking'),
					kind: 'thinking',
					data: { text: '' },
					contentPhase: 'open',
					messageId: event.messageId,
				}
				upsert(block)
				runPhase = 'running'
				return
			}
			case 'thinking_delta': {
				const key = blockKey(event.messageId, event.contentIndex, 'thinking')
				const prev = blocks.get(key)
				if (!prev || prev.kind !== 'thinking') return
				upsert({
					...prev,
					data: { text: prev.data.text + event.delta },
					contentPhase: 'open',
				})
				runPhase = 'running'
				return
			}
			case 'thinking_end': {
				const key = blockKey(event.messageId, event.contentIndex, 'thinking')
				const prev = blocks.get(key)
				const block: ThinkingBlock = {
					key,
					kind: 'thinking',
					data: { text: event.content ?? textOf(prev) },
					contentPhase: 'complete',
					messageId: event.messageId,
				}
				upsert(block)
				if (runPhase === 'running' || runPhase === 'awaiting') runPhase = 'awaiting'
				return
			}
			case 'text_start': {
				const block: TextBlock = {
					key: blockKey(event.messageId, event.contentIndex, 'text'),
					kind: 'text',
					data: { text: '' },
					contentPhase: 'open',
					messageId: event.messageId,
				}
				upsert(block)
				runPhase = 'running'
				return
			}
			case 'text_delta': {
				const key = blockKey(event.messageId, event.contentIndex, 'text')
				const prev = blocks.get(key)
				if (!prev || prev.kind !== 'text') return
				upsert({
					...prev,
					data: { text: prev.data.text + event.delta },
					contentPhase: 'open',
				})
				runPhase = 'running'
				return
			}
			case 'text_end': {
				const key = blockKey(event.messageId, event.contentIndex, 'text')
				const prev = blocks.get(key)
				const block: TextBlock = {
					key,
					kind: 'text',
					data: { text: event.content ?? textOf(prev) },
					contentPhase: 'complete',
					messageId: event.messageId,
				}
				upsert(block)
				if (runPhase === 'running' || runPhase === 'awaiting') runPhase = 'awaiting'
				return
			}
			default: {
				const _unknown: never = event
				void _unknown
			}
		}
	}

	const flush = () => {
		if (raf) {
			cancelAnimationFrame(raf)
			raf = 0
		}
		if (pending.length === 0) return
		const batch = pending
		pending = []
		resetTouch()
		for (const event of batch) applyOne(event)
		emit()
	}

	const schedule = () => {
		if (raf) return
		raf = requestAnimationFrame(() => {
			raf = 0
			flush()
		})
	}

	return {
		apply(event) {
			pending.push(event)
			if (publicationOf(event) === 'immediate') flush()
			else schedule()
		},
		replace(messages) {
			if (raf) {
				cancelAnimationFrame(raf)
				raf = 0
			}
			pending = []
			resetTouch()
			noteInsert()
			order = []
			blocks.clear()
			runPhase = 'idle'
			for (const message of messages) {
				if (message.role === 'user') {
					applyOne({ type: 'user', messageId: message.id, text: message.text })
					continue
				}
				for (const part of message.parts) {
					if (part.type === 'thinking') {
						applyOne({
							type: 'thinking_start',
							messageId: message.id,
							contentIndex: part.contentIndex,
						})
						applyOne({
							type: 'thinking_end',
							messageId: message.id,
							contentIndex: part.contentIndex,
							content: part.text,
						})
						continue
					}
					applyOne({
						type: 'text_start',
						messageId: message.id,
						contentIndex: part.contentIndex,
					})
					applyOne({
						type: 'text_end',
						messageId: message.id,
						contentIndex: part.contentIndex,
						content: part.text,
					})
				}
			}
			runPhase = 'idle'
			emit()
		},
		subscribe(listener) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		getSnapshot() {
			return snapshot
		},
	}
}
