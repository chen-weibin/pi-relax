import { useEffect, useRef, useState } from 'react'
import { DisclosureRow } from '../../ui/DisclosureRow'
import { MarkdownView } from '../../ui/MarkdownView'
import type { ThinkingBlock } from '../../conversation'
import { useStreamText } from './useStreamText'

export type ThinkingMessageProps = {
	block: ThinkingBlock
	expandTick?: number
}

function useLived(streaming: boolean): boolean {
	const lived = useRef(false)
	if (streaming) lived.current = true
	return lived.current
}

export function ThinkingMessage({ block, expandTick = 0 }: ThinkingMessageProps) {
	const streaming = block.contentPhase === 'open'
	const text = useStreamText(block.data.text, streaming)
	const live = useLived(streaming)
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])

	return (
		<DisclosureRow title="思考" open={open} blinking={streaming} chevron="hover" onOpenChange={setOpen}>
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
