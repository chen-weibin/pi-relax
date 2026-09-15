import { MarkdownView } from '../../ui/MarkdownView'
import type { TextBlock } from '../../conversation'

export type AssistantMessageProps = {
	block: TextBlock
}

export function AssistantMessage({ block }: AssistantMessageProps) {
	const streaming = block.contentPhase === 'open'
	return (
		<MarkdownView
			text={block.data.text}
			mode={streaming ? 'streaming' : 'static'}
			isAnimating={streaming}
		/>
	)
}
