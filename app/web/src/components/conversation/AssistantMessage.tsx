import { useRef } from 'react'
import { MarkdownView } from '../../ui/MarkdownView'
import type { TextBlock } from '../../conversation'
import { useStreamText } from './useStreamText'

export type AssistantMessageProps = {
	block: TextBlock
}

function useLived(streaming: boolean): boolean {
	const lived = useRef(false)
	if (streaming) lived.current = true
	return lived.current
}

export function AssistantMessage({ block }: AssistantMessageProps) {
	const streaming = block.contentPhase === 'open'
	const text = useStreamText(block.data.text, streaming)
	const live = useLived(streaming)
	return <MarkdownView text={text} live={live} streaming={streaming} isAnimating={streaming} />
}
