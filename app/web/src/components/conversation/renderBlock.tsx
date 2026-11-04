import type { ComponentType } from 'react'
import type { BlockKind, BlockSnapshot } from '../../conversation'
import { AssistantMessage } from './AssistantMessage'
import { GenericBlock } from './GenericBlock'
import { ThinkingMessage } from './ThinkingMessage'
import { ToolMessage } from './ToolMessage'
import { UserMessage } from './UserMessage'

export type BlockRendererProps = {
	block: BlockSnapshot
	expandTick?: number
}

const registry: { [K in BlockKind]: ComponentType<BlockRendererProps> } = {
	'user-text': ({ block }) =>
		block.kind === 'user-text' ? <UserMessage block={block} /> : null,
	thinking: ({ block, expandTick }) =>
		block.kind === 'thinking' ? <ThinkingMessage block={block} expandTick={expandTick} /> : null,
	text: ({ block }) => (block.kind === 'text' ? <AssistantMessage block={block} /> : null),
	tool: ({ block, expandTick }) => (block.kind === 'tool' ? <ToolMessage block={block} expandTick={expandTick} /> : null),
}

export function renderConversationBlock(props: BlockRendererProps) {
	const Renderer = registry[props.block.kind]
	if (!Renderer) return <GenericBlock block={props.block} />
	return <Renderer {...props} />
}
