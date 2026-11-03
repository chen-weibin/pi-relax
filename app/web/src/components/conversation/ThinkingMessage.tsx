import { useRef, useState } from 'react'
import { DisclosureRow } from '../../ui/DisclosureRow'
import { MarkdownView } from '../../ui/MarkdownView'
import type { ThinkingBlock } from '../../conversation'
import { useStreamText } from './useStreamText'

export type ThinkingMessageProps = {
	block: ThinkingBlock
}

function useLived(streaming: boolean): boolean {
	const lived = useRef(false)
	if (streaming) lived.current = true
	return lived.current
}

export function ThinkingMessage({ block }: ThinkingMessageProps) {
	const streaming = block.contentPhase === 'open'
	const text = useStreamText(block.data.text, streaming)
	const live = useLived(streaming)
	const [open, setOpen] = useState(false)
	const title = streaming ? '思考中' : '思考'

	return (
		<DisclosureRow title={title} open={open} blinking={streaming} chevron="hover" onOpenChange={setOpen}>
			<MarkdownView
				text={text}
				live={live}
				streaming={streaming}
				isAnimating={open && streaming}
				className="markdown-view--dim"
			/>
		</DisclosureRow>
	)
}
