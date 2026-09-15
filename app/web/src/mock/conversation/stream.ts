import type { BlockFeedEvent } from '../../conversation'

const THINKING = '先把用户消息落到卡片里，再流式输出思考，最后写正文 Markdown。折叠行只在展开时打字。'

const ANSWER = [
	'收到。这一轮会：',
	'',
	'- 立刻渲染你的输入',
	'- 思考过程可展开（打字机）',
	'- 正文用流式 Markdown',
	'',
	'示例代码：',
	'',
	'```ts',
	'runtime.apply({ type: "text_delta", delta: "…" })',
	'```',
	'',
	'结束后思考保持你展开或收起的状态。',
].join('\n')

function chunk(text: string, size: number): string[] {
	const parts: string[] = []
	for (let i = 0; i < text.length; i += size) {
		parts.push(text.slice(i, i + size))
	}
	return parts
}

export function buildMockStreamEvents(round: number): BlockFeedEvent[] {
	const userId = `live-user-${round}`
	const asstId = `live-asst-${round}`
	const events: BlockFeedEvent[] = [
		{ type: 'run_start' },
		{
			type: 'user',
			messageId: userId,
			text: '帮我演示一下流式回复，带思考过程。',
		},
		{ type: 'thinking_start', messageId: asstId, contentIndex: 0 },
	]
	for (const delta of chunk(THINKING, 2)) {
		events.push({
			type: 'thinking_delta',
			messageId: asstId,
			contentIndex: 0,
			delta,
		})
	}
	events.push({
		type: 'thinking_end',
		messageId: asstId,
		contentIndex: 0,
		content: THINKING,
	})
	events.push({ type: 'text_start', messageId: asstId, contentIndex: 1 })
	for (const delta of chunk(ANSWER, 3)) {
		events.push({
			type: 'text_delta',
			messageId: asstId,
			contentIndex: 1,
			delta,
		})
	}
	events.push({
		type: 'text_end',
		messageId: asstId,
		contentIndex: 1,
		content: ANSWER,
	})
	events.push({ type: 'run_end' })
	return events
}

function delayOf(event: BlockFeedEvent): number {
	switch (event.type) {
		case 'run_start':
		case 'user':
			return 0
		case 'run_end':
		case 'run_error':
			return 0
		case 'thinking_start':
		case 'text_start':
			return 80
		case 'thinking_end':
		case 'text_end':
			return 220
		case 'thinking_delta':
		case 'text_delta':
			return 28
		default: {
			const _exhaustive: never = event
			return _exhaustive
		}
	}
}

export function playMockStream(
	events: BlockFeedEvent[],
	apply: (event: BlockFeedEvent) => void,
	onDone: () => void,
): () => void {
	let i = 0
	let timer = 0
	const step = () => {
		const event = events[i]
		if (!event) {
			onDone()
			return
		}
		apply(event)
		i += 1
		timer = window.setTimeout(step, delayOf(event))
	}
	step()
	return () => {
		window.clearTimeout(timer)
	}
}
