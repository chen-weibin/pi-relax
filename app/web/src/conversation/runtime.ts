import type {
	BlockFeedEvent,
	BlockSnapshot,
	CompletedMessage,
	ConversationSnapshot,
	MessageSnapshot,
	Publication,
	RunPhase,
	CompletedPart,
	TextBlock,
	ThinkingBlock,
	ToolBlock,
	ToolData,
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

function toolSlot(messageId: string, contentIndex: number): string {
	return `${messageId}:${contentIndex}`
}

function provisionalToolKey(messageId: string, contentIndex: number): string {
	return `${messageId}:${contentIndex}:tool`
}

const EMPTY_TOOL: ToolData = { name: '', argumentsText: '', resultText: '', isError: false }

function publicationOf(event: BlockFeedEvent): Publication {
	switch (event.type) {
		case 'thinking_delta':
		case 'text_delta':
		case 'tool_delta':
			return 'animation-frame'
		case 'tool_result':
			return event.done ? 'immediate' : 'animation-frame'
		case 'run_start':
		case 'run_end':
		case 'run_error':
		case 'user':
		case 'thinking_start':
		case 'thinking_end':
		case 'text_start':
		case 'text_end':
		case 'tool_start':
		case 'tool_end':
		case 'tool_run':
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
		case 'tool':
			return (
				prev.kind === 'tool' &&
				prev.data.name === next.data.name &&
				prev.data.argumentsText === next.data.argumentsText &&
				prev.data.resultText === next.data.resultText &&
				prev.data.isError === next.data.isError
			)
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
		case 'tool':
			return ''
		default: {
			const _exhaustive: never = block
			return _exhaustive
		}
	}
}

export function settledPartEvents(messageId: string, parts: readonly CompletedPart[]): BlockFeedEvent[] {
	const events: BlockFeedEvent[] = []
	for (const part of parts) {
		if (part.type === 'thinking') {
			events.push(
				{ type: 'thinking_start', messageId, contentIndex: part.contentIndex },
				{ type: 'thinking_end', messageId, contentIndex: part.contentIndex, content: part.text },
			)
			continue
		}
		if (part.type === 'tool') {
			events.push({
				type: 'tool_end',
				messageId,
				contentIndex: part.contentIndex,
				toolCallId: part.id,
				name: part.name,
				argumentsText: part.argumentsText,
				settled: true,
			})
			if (part.resultText !== '' || part.isError) {
				events.push({
					type: 'tool_result',
					toolCallId: part.id,
					name: part.name,
					resultText: part.resultText,
					isError: part.isError,
					done: true,
				})
			}
			continue
		}
		events.push(
			{ type: 'text_start', messageId, contentIndex: part.contentIndex },
			{ type: 'text_end', messageId, contentIndex: part.contentIndex, content: part.text },
		)
	}
	return events
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
	const toolAlias = new Map<string, string>()
	const toolIds = new Map<string, string>()

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

	const rekey = (from: string, to: string) => {
		if (from === to) return
		const block = blocks.get(from)
		if (!block) return
		blocks.delete(from)
		if (blocks.has(to)) {
			order = order.filter((key) => key !== from)
		} else {
			blocks.set(to, { ...block, key: to })
			order = order.map((key) => (key === from ? to : key))
		}
		noteInsert()
	}

	const toolKey = (messageId: string, contentIndex: number, toolCallId?: string) => {
		const slot = toolSlot(messageId, contentIndex)
		const current = toolAlias.get(slot) ?? (toolCallId ? toolCallId : provisionalToolKey(messageId, contentIndex))
		if (!toolCallId || current === toolCallId) return current
		rekey(current, toolCallId)
		return toolCallId
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
				const text = event.content ?? (prev?.kind === 'thinking' ? prev.data.text + event.delta : undefined)
				if (text === undefined) return
				const block: ThinkingBlock = {
					key,
					kind: 'thinking',
					data: { text },
					contentPhase: 'open',
					messageId: event.messageId,
				}
				upsert(prev?.kind === 'thinking' ? { ...prev, data: { text }, contentPhase: 'open' } : block)
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
				const text = event.content ?? (prev?.kind === 'text' ? prev.data.text + event.delta : undefined)
				if (text === undefined) return
				const block: TextBlock = {
					key,
					kind: 'text',
					data: { text },
					contentPhase: 'open',
					messageId: event.messageId,
				}
				upsert(prev?.kind === 'text' ? { ...prev, data: { text }, contentPhase: 'open' } : block)
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
			case 'tool_start':
			case 'tool_delta':
			case 'tool_end': {
				const key = toolKey(event.messageId, event.contentIndex, event.toolCallId)
				const prev = blocks.get(key)
				const data: ToolData = prev?.kind === 'tool' ? prev.data : EMPTY_TOOL
				const name = event.name || data.name
				let argumentsText = data.argumentsText
				if (event.type === 'tool_delta') argumentsText += event.delta
				if (event.type === 'tool_end') argumentsText = event.argumentsText
				const block: ToolBlock = {
					key,
					kind: 'tool',
					data: { ...data, name, argumentsText },
					contentPhase: event.type === 'tool_end' && (event.settled || prev?.contentPhase === 'complete') ? 'complete' : 'open',
					messageId: event.messageId,
				}
				upsert(block)
				toolAlias.set(toolSlot(event.messageId, event.contentIndex), key)
				if (event.toolCallId) toolIds.set(event.toolCallId, key)
				if (event.type === 'tool_end') {
					if (!event.settled && (runPhase === 'running' || runPhase === 'awaiting')) runPhase = 'awaiting'
				} else {
					runPhase = 'running'
				}
				return
			}
			case 'tool_run':
			case 'tool_result': {
				const key = toolIds.get(event.toolCallId) ?? event.toolCallId
				const prev = blocks.get(key)
				const data: ToolData = prev?.kind === 'tool' ? prev.data : EMPTY_TOOL
				const block: ToolBlock = {
					key,
					kind: 'tool',
					data: {
						name: event.name || data.name,
						argumentsText: data.argumentsText,
						resultText: event.type === 'tool_result' ? event.resultText : data.resultText,
						isError: event.type === 'tool_result' && event.isError !== undefined ? event.isError : data.isError,
					},
					contentPhase:
						event.type === 'tool_result' && (event.done || prev?.contentPhase === 'complete') ? 'complete' : 'open',
					messageId: prev?.messageId ?? key,
				}
				upsert(block)
				toolIds.set(event.toolCallId, key)
				if (block.contentPhase === 'open') runPhase = 'running'
				else if (runPhase === 'running' || runPhase === 'awaiting') runPhase = 'awaiting'
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
			toolAlias.clear()
			toolIds.clear()
			runPhase = 'idle'
			for (const message of messages) {
				if (message.role === 'user') {
					applyOne({ type: 'user', messageId: message.id, text: message.text })
					continue
				}
				for (const event of settledPartEvents(message.id, message.parts)) applyOne(event)
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
