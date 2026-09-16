import type { BlockFeedEvent } from '../../conversation'

const THINKING = '把历史里那套 MD 格式搬到流式：h1–h3、段落 + 行内 code + 链接、嵌套 ul、有序 ol、引用、代码高亮、Mermaid、公式、CJK 强调、分割线。chunk 仍然 3 字，方便看 syntax 自动闭合。'

const ANSWER = [
	'# 流式一级',
	'',
	'流式状态下，未闭合语法由 streamdown 自动闭合。',
	'',
	'## 流式二级',
	'',
	'### 流式三级',
	'',
	'段落包含 **粗体**、*斜体*、`inline code`，以及一个 [内部链接](../web.md)。**中文（括注）。**后续仍应加粗闭合。',
	'',
	'- 流式 ul A',
	'- 流式 ul B',
	'  - 嵌套 B.1',
	'  - 嵌套 B.2',
	'- 流式 ul C',
	'',
	'1. 流式 ol 1',
	'2. 流式 ol 2',
	'3. 流式 ol 3',
	'',
	'> 流式引用，验证 `parseIncompleteMarkdown` 不会把它提前关掉。',
	'',
	'```ts',
	'type User = { id: string; name: string }',
	'const greet = (user: User) => {',
	'  const label = `hi ${user.name}`',
	'  console.log(label, user.id)',
	'  return label',
	'}',
	'greet({ id: "1", name: "pi" })',
	'```',
	'',
	'行内公式 $$E = mc^2$$，块级如下。',
	'',
	'$$',
	'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
	'$$',
	'',
	'```mermaid',
	'graph LR',
	'    A[Start] --> B{Ready?}',
	'    B -->|Yes| C[Render]',
	'    B -->|No| D[Wait]',
	'    D --> B',
	'```',
	'',
	'---',
	'',
	'分割线以上是代码 / 公式 / 图表示例。',
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
			text: '演示一下 **流式回复**，带思考过程。要看 `#` 标题、列表、`>` 引用、`code` 块、公式、Mermaid 和 [链接](../web.md)。',
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
