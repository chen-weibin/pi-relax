import { useEffect, useState } from 'react'
import type { ToolBlock } from '../../conversation'
import { DisclosureRow } from '../../ui/DisclosureRow'
import { MarkdownView } from '../../ui/MarkdownView'

export type ToolMessageProps = {
	block: ToolBlock
	expandTick?: number
}

export function ToolMessage({ block, expandTick = 0 }: ToolMessageProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])
	const { name, argumentsText, resultText, isError } = block.data

	return (
		<DisclosureRow title={name || '工具'} open={open} blinking={streaming} chevron="hover" onOpenChange={setOpen}>
			{argumentsText ? <pre className="whitespace-pre-wrap text-sm text-fg-3">{argumentsText}</pre> : null}
			{resultText ? (
				isError ? (
					<p className="whitespace-pre-wrap text-sm text-error">{resultText}</p>
				) : (
					<MarkdownView text={resultText} live={false} streaming={false} />
				)
			) : null}
		</DisclosureRow>
	)
}
