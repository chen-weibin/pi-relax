import { MarkdownView } from '../../ui/MarkdownView'
import type { TextBlock } from '../../conversation'
import { useStreamText } from './useStreamText'

export type AssistantMessageProps = {
	block: TextBlock
}

export function AssistantMessage({ block }: AssistantMessageProps) {
	const streaming = block.contentPhase === 'open'
	const text = useStreamText(block.data.text, streaming)
	return (
		<MarkdownView
			text={text}
			mode={streaming ? 'streaming' : 'static'}
			isAnimating={streaming}
			highlight={!streaming}
		/>
	)
}
