import { useState } from 'react'
import { DisclosureRow } from '../../ui/DisclosureRow'
import { MarkdownView } from '../../ui/MarkdownView'
import type { ThinkingBlock } from '../../conversation'

export type ThinkingMessageProps = {
	block: ThinkingBlock
}

export function ThinkingMessage({ block }: ThinkingMessageProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	const title = streaming ? '思考中' : '思考'

	return (
		<DisclosureRow title={title} open={open} blinking={streaming} onOpenChange={setOpen}>
			<MarkdownView
				text={block.data.text}
				mode={streaming ? 'streaming' : 'static'}
				isAnimating={open && streaming}
			/>
		</DisclosureRow>
	)
}
