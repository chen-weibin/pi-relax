import { useEffect, useMemo, useState } from 'react'
import { toolOpeningTitle } from '../../../../conversation/toolOpening'
import { parseToolArguments } from '../../../../conversation/toolText'
import { DisclosureRow } from '../../../../ui/DisclosureRow'
import { MarkdownView } from '../../../../ui/MarkdownView'
import { Popover } from '../../../../ui/Popover'
import { ShinyText } from '../../../../ui/ShinyText'
import { SiteIconRow } from '../../../../ui/SiteIconRow'
import { faviconUrl } from '../../../../utils/faviconUrl'
import { TrailText } from '../../../../ui/TrailText'
import type { ToolRendererProps } from '../types'
import { parseSearchDocument, searchKeywords } from './webResult'

function openSite(url: string) {
	if (!/^https?:\/\//.test(url)) return
	window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * 搜索网络。
 *
 * 收起时是「搜索网络 + N 个关键词」和网站图标。关键词悬停出列表。
 * 图标最多 10 个圆，多出来的收进 `+N`。箭头跟在这一排后面。
 * 展开后整段正文交给 Markdown。段尾的 Source 已换成行内来源指令。
 * 进度句没有正文，这一行不可展开。
 */
export function WebSearchTool({ block, expandTick = 0 }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])

	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const keywords = searchKeywords(args)
	const document = useMemo(() => parseSearchDocument(block.data.resultText), [block.data.resultText])
	const canOpen = document.markdown.length > 0
	const opening = toolOpeningTitle('web_search')

	const title = (
		<span className="flex min-w-0 items-center gap-2">
			<span className="inline-flex shrink-0 items-center">
				{streaming ? (
					<ShinyText text={opening} speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
				) : (
					opening
				)}
				{keywords.length > 0 ? (
					<Popover
						trigger={['hover']}
						interactive
						placement="bottom-start"
						className="p-1"
						content={
							<div className="max-h-[300px] min-w-[160px] max-w-[360px] overflow-y-auto">
								{keywords.map((keyword, index) => (
									<div key={`${keyword}-${index}`} className="truncate px-2.5 py-1 text-sm text-fg-2">
										{keyword}
									</div>
								))}
							</div>
						}
					>
						<span className="ml-2">
							<TrailText text={`${keywords.length} 个关键词`} />
						</span>
					</Popover>
				) : null}
			</span>
			{document.sites.length > 0 ? (
				<span className="flex min-w-0" onClick={(event) => event.stopPropagation()}>
					<SiteIconRow
						max={10}
						overflowHover
						sites={document.sites.map((site) => ({
							...site,
							src: faviconUrl(site.url),
							tooltip: site.name,
							onClick: () => openSite(site.url),
						}))}
					/>
				</span>
			) : null}
		</span>
	)

	return (
		<DisclosureRow title={title} open={open} chevron="hover" disabled={!canOpen} onOpenChange={setOpen}>
			<MarkdownView text={document.markdown} live={false} streaming={false} />
		</DisclosureRow>
	)
}
