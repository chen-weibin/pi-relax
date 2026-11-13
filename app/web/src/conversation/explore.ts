import { isRunBusy, type BlockSnapshot, type ConversationSnapshot } from './types.ts'

export type Segment =
	| { type: 'user'; id: string; blocks: BlockSnapshot[] }
	| { type: 'explore'; id: string; blocks: BlockSnapshot[] }
	| { type: 'text'; id: string; block: BlockSnapshot }

export type TurnLayout = { id: string; segments: Segment[] }

function blocksOf(snapshot: ConversationSnapshot, keys: readonly string[]): BlockSnapshot[] {
	const blocks: BlockSnapshot[] = []
	for (const key of keys) {
		const block = snapshot.byKey[key]
		if (block) blocks.push(block)
	}
	return blocks
}

function segmentAssistant(blocks: readonly BlockSnapshot[]): Segment[] {
	const out: Segment[] = []
	let explore: BlockSnapshot[] = []
	const flush = () => {
		const first = explore[0]
		if (!first) return
		out.push({ type: 'explore', id: first.key, blocks: explore })
		explore = []
	}
	for (const block of blocks) {
		if (block.kind === 'thinking' || block.kind === 'tool') {
			explore.push(block)
			continue
		}
		flush()
		out.push({ type: 'text', id: block.key, block })
	}
	flush()
	return out
}

/** 一个用户回合里，连续的思考和工具收成一组。正文把前后拆开。 */
export function layoutTurns(snapshot: ConversationSnapshot): { leading: Segment[]; turns: TurnLayout[] } {
	const leading: BlockSnapshot[] = []
	const turns: { id: string; user: Segment | null; assistant: BlockSnapshot[] }[] = []
	for (const messageId of snapshot.messageOrder) {
		const group = snapshot.messages[messageId]
		if (!group) continue
		const blocks = blocksOf(snapshot, group.blockKeys)
		if (blocks.length === 0) continue
		if (group.role === 'user') {
			turns.push({ id: group.id, user: { type: 'user', id: group.id, blocks }, assistant: [] })
			continue
		}
		const turn = turns[turns.length - 1]
		if (turn) turn.assistant.push(...blocks)
		else leading.push(...blocks)
	}
	return {
		leading: segmentAssistant(leading),
		turns: turns.map((turn) => ({
			id: turn.id,
			segments: [...(turn.user ? [turn.user] : []), ...segmentAssistant(turn.assistant)],
		})),
	}
}

export function blockTitle(block: BlockSnapshot): string {
	if (block.kind === 'thinking') return '思考'
	if (block.kind === 'tool') return block.data.name || '工具'
	return '规划探索'
}

/** `live` 表示这一组还是当前回复的末尾，并且这一轮还在跑。 */
export function exploreHeading(blocks: readonly BlockSnapshot[], live: boolean): { title: string; blinking: boolean } {
	const open = [...blocks].reverse().find((block) => block.contentPhase === 'open')
	if (open) return { title: blockTitle(open), blinking: true }
	if (live) {
		const last = blocks[blocks.length - 1]
		return { title: last ? blockTitle(last) : '规划探索', blinking: true }
	}
	return { title: '规划探索', blinking: false }
}

/** 只在这一轮还忙、并且回复里还没有任何块的时候为真。 */
export function showAwaiting(snapshot: ConversationSnapshot): boolean {
	if (!isRunBusy(snapshot.runPhase)) return false
	for (let index = snapshot.messageOrder.length - 1; index >= 0; index -= 1) {
		const message = snapshot.messages[snapshot.messageOrder[index] ?? '']
		if (!message) continue
		if (message.role === 'user') return true
		if (message.blockKeys.some((key) => snapshot.byKey[key])) return false
	}
	return true
}
