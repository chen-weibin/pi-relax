import { useEffect, useMemo, useState } from 'react'
import { toolOpeningTitle } from '../../../../conversation/toolOpening'
import { parseToolArguments } from '../../../../conversation/toolText'
import { DisclosureRow } from '../../../../ui/DisclosureRow'
import { ShinyText } from '../../../../ui/ShinyText'
import { SourceChip } from '../../../../ui/SourceChip'
import { TrailText } from '../../../../ui/TrailText'
import { faviconUrl } from '../../../../utils/faviconUrl'
import type { ToolRendererProps } from '../types'
import { readSourceCheck } from './webResult'

function openSource(url: string) {
	if (!/^https?:\/\//.test(url)) return
	window.open(url, '_blank', 'noopener,noreferrer')
}

/** 核查：折叠时主张。展开后说明在上，来源胶囊另起一行。 */
export function SourceCheckTool({ block, expandTick = 0 }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])

	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const claim = typeof args?.claim === 'string' ? args.claim : ''
	const view = useMemo(() => readSourceCheck(block.data.details), [block.data.details])
	const description = view.rationale || view.status
	const canOpen = description !== '' || view.sources.length > 0
	const opening = toolOpeningTitle('source_check')
	const title = (
		<span className="inline-block min-w-0 max-w-[60%] truncate">
			{streaming ? (
				<ShinyText text={opening} speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
			) : (
				opening
			)}
			{claim ? (
				<span className="ml-2">
					<TrailText text={claim} />
				</span>
			) : null}
		</span>
	)

	return (
		<DisclosureRow title={title} open={open} chevron="hover" disabled={!canOpen} onOpenChange={setOpen}>
			<div className="flex flex-col gap-2">
				{description ? <p className="text-sm text-fg-2">{description}</p> : null}
				{view.sources.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{view.sources.map((source) => (
							<SourceChip
								key={`${source.rank}-${source.url}`}
								name={source.title}
								src={faviconUrl(source.url)}
								size="sm"
								tooltip={source.url}
								onClick={() => openSource(source.url)}
							/>
						))}
					</div>
				) : null}
			</div>
		</DisclosureRow>
	)
}
