import { useEffect, useState } from 'react'
import { DisclosureRow } from '../../../ui/DisclosureRow'
import { MarkdownView } from '../../../ui/MarkdownView'
import type { ToolRendererProps } from './types'

/** 没有专属渲染的工具走这里。工具名当标题，参数纯文本，结果走 Markdown。 */
export function DefaultTool({ block, expandTick = 0 }: ToolRendererProps) {
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
