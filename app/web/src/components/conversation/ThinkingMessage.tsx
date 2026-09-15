import { useEffect, useState } from 'react'
import { DisclosureRow } from '../../ui/DisclosureRow'
import { TypewriterText } from '../../ui/TypewriterText'
import type { ThinkingBlock } from '../../conversation'
import type { ThinkingUiMode } from './thinking-mode'

export type ThinkingMessageProps = {
	block: ThinkingBlock
	mode: ThinkingUiMode
}

export function ThinkingMessage({ block, mode }: ThinkingMessageProps) {
	const streaming = block.contentPhase === 'open'
	const blinkOnly = mode === 'title-blink-only'
	const [userOpen, setUserOpen] = useState<boolean | null>(null)

	useEffect(() => {
		if (streaming) setUserOpen(null)
	}, [streaming, block.key])

	const policyOpen = blinkOnly ? false : streaming
	const open = userOpen ?? policyOpen
	const title = streaming ? '思考中' : '思考'

	return (
		<DisclosureRow
			title={title}
			open={open}
			blinking={streaming}
			disabled={blinkOnly}
			onOpenChange={(next) => {
				if (blinkOnly) return
				setUserOpen(next)
			}}
		>
			<TypewriterText text={block.data.text} playing={open && streaming} />
		</DisclosureRow>
	)
}
