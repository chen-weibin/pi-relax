export type ContentPhase = 'pending' | 'open' | 'complete' | 'aborted'

/** Session-level run, not inferred from the last block. */
export type RunPhase = 'idle' | 'running' | 'awaiting' | 'complete' | 'error'

/**
 * Known block kinds. Add members here when introducing tool / image / error UI.
 * Renderer registry and BlockSnapshot must stay in sync with this union.
 */
export type BlockKind = 'user-text' | 'thinking' | 'text'

export type UserTextData = { text: string }
export type ThinkingData = { text: string }
export type TextData = { text: string }

type BlockBase = {
	key: string
	contentPhase: ContentPhase
	messageId: string
}

export type UserTextBlock = BlockBase & {
	kind: 'user-text'
	data: UserTextData
}

export type ThinkingBlock = BlockBase & {
	kind: 'thinking'
	data: ThinkingData
}

export type TextBlock = BlockBase & {
	kind: 'text'
	data: TextData
}

/**
 * Discriminated on `kind`. v1 members all carry text, but data is per-kind so
 * later tool/image/error blocks can use incompatible shapes without widening
 * every renderer to `{ text: string }`.
 */
export type BlockSnapshot = UserTextBlock | ThinkingBlock | TextBlock

export type MessageRole = 'user' | 'assistant'

export type MessageSnapshot = {
	id: string
	role: MessageRole
	blockKeys: readonly string[]
}

export type ConversationSnapshot = {
	revision: number
	order: readonly string[]
	byKey: Readonly<Record<string, BlockSnapshot>>
	messageOrder: readonly string[]
	messages: Readonly<Record<string, MessageSnapshot>>
	runPhase: RunPhase
}

export type CompletedPart = {
	type: 'thinking' | 'text'
	text: string
	/** 在 assistant content 数组里的下标。toolCall 占下标但不进 parts。 */
	contentIndex: number
}

export type CompletedMessage =
	| { role: 'user'; id: string; text: string }
	| { role: 'assistant'; id: string; parts: CompletedPart[] }

/**
 * Normalized feed the runtime understands.
 *
 * `adaptAgentSession` maps `AgentSessionEvent` onto this union, then
 * `runtime.apply`. Opened history uses `historyToMessages` and `runtime.replace`.
 */
export type BlockFeedEvent =
	| { type: 'run_start' }
	| { type: 'run_end' }
	| { type: 'run_error' }
	| { type: 'user'; messageId: string; text: string }
	| { type: 'thinking_start'; messageId: string; contentIndex: number }
	| { type: 'thinking_delta'; messageId: string; contentIndex: number; delta: string }
	| { type: 'thinking_end'; messageId: string; contentIndex: number; content?: string }
	| { type: 'text_start'; messageId: string; contentIndex: number }
	| { type: 'text_delta'; messageId: string; contentIndex: number; delta: string }
	| { type: 'text_end'; messageId: string; contentIndex: number; content?: string }

export type Publication = 'immediate' | 'animation-frame'

export function isRunBusy(phase: RunPhase): boolean {
	return phase === 'running' || phase === 'awaiting'
}
