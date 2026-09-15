import type { ComponentType } from 'react'
import type { BlockKind, BlockSnapshot } from '../../conversation'
import { AssistantMessage } from './AssistantMessage'
import { GenericBlock } from './GenericBlock'
import { ThinkingMessage } from './ThinkingMessage'
import { UserMessage } from './UserMessage'
import type { ThinkingUiMode } from './thinking-mode'

export type BlockRendererProps = {
	block: BlockSnapshot
	thinkingUiMode: ThinkingUiMode
}

const registry: { [K in BlockKind]: ComponentType<BlockRendererProps> } = {
	'user-text': ({ block }) =>
		block.kind === 'user-text' ? <UserMessage block={block} /> : null,
	thinking: ({ block, thinkingUiMode }) =>
		block.kind === 'thinking' ? (
			<ThinkingMessage block={block} mode={thinkingUiMode} />
		) : null,
	text: ({ block }) => (block.kind === 'text' ? <AssistantMessage block={block} /> : null),
}

export function renderConversationBlock(props: BlockRendererProps) {
	const Renderer = registry[props.block.kind]
	if (!Renderer) return <GenericBlock block={props.block} />
	return <Renderer {...props} />
}
