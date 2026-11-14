import { useEffect, useMemo, useState } from 'react'
import { toolOpeningTitle } from '../../../../conversation/toolOpening'
import { parseToolArguments } from '../../../../conversation/toolText'
import { DisclosureRow } from '../../../../ui/DisclosureRow'
import { MarkdownView } from '../../../../ui/MarkdownView'
import { ShinyText } from '../../../../ui/ShinyText'
import { TrailText } from '../../../../ui/TrailText'
import type { ToolRendererProps } from '../types'
import { archiveDesc } from './webResult'

/**
 * 读取存档。
 *
 * 收起时是「读取存档 + 短说明」。没有结果时这一行禁用。
 * 展开后是带边框的卡片，正文按 Markdown 画。出错时卡片里是原文，不走 Markdown。
 */
export function GetSearchContentTool({ block, expandTick = 0 }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])

	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const { desc } = archiveDesc(args, block.data.details)
	const resultText = block.data.resultText
	const canOpen = resultText.trim() !== ''
	const opening = toolOpeningTitle('get_search_content')
	const title = (
		<span className="inline-block min-w-0 max-w-[60%] truncate">
			{streaming ? (
				<ShinyText text={opening} speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
			) : (
				opening
			)}
			{desc ? (
				<span className="ml-2">
					<TrailText text={desc} />
				</span>
			) : null}
		</span>
	)

	return (
		<DisclosureRow title={title} open={open} chevron="hover" disabled={!canOpen} onOpenChange={setOpen}>
			<div className="max-h-[360px] overflow-auto rounded-lg border border-border bg-app p-3">
				{block.data.isError ? (
					<p className="whitespace-pre-wrap text-sm text-error">{resultText}</p>
				) : (
					<MarkdownView text={resultText} live={false} streaming={false} />
				)}
			</div>
		</DisclosureRow>
	)
}
