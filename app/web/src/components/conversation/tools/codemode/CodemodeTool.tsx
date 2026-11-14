import { useEffect, useMemo, useState } from 'react'
import type { ToolBlock } from '../../../../conversation'
import { toolOpeningTitle } from '../../../../conversation/toolOpening'
import { DisclosureRow } from '../../../../ui/DisclosureRow'
import { ShinyText } from '../../../../ui/ShinyText'
import { TrailText } from '../../../../ui/TrailText'
import { renderNamedTool } from '../renderNamedTool'
import type { ToolRendererProps } from '../types'
import { readCodemodeCalls } from './codemodeCalls'

/**
 * codemode 专属渲染。
 *
 * 折叠时「编排 + N 个工具」。展开后每个嵌套调用走已有工具渲染。
 * calls 只有工具名和截断参数，没有结果正文。
 */
export function CodemodeTool({ block, expandTick = 0 }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])

	const calls = useMemo(() => readCodemodeCalls(block.data.details), [block.data.details])
	const opening = toolOpeningTitle('codemode')
	const title = (
		<span className="inline-block min-w-0 max-w-[60%] truncate">
			{streaming ? (
				<ShinyText text={opening} speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
			) : (
				opening
			)}
			{calls.length > 0 ? (
				<span className="ml-2">
					<TrailText text={`${calls.length} 个工具`} />
				</span>
			) : null}
		</span>
	)

	return (
		<DisclosureRow title={title} open={open} chevron="hover" disabled={calls.length === 0} onOpenChange={setOpen}>
			<div className="flex flex-col gap-0.5">
				{calls.map((call, index) => {
					const child: ToolBlock = {
						key: call.id || `${block.key}/${index}`,
						contentPhase: call.status === 'running' ? 'open' : 'complete',
						messageId: block.messageId,
						kind: 'tool',
						data: {
							name: call.name,
							argumentsText: call.args,
							resultText: call.error ?? '',
							isError: call.status === 'error',
						},
					}
					return <div key={child.key}>{renderNamedTool({ block: child })}</div>
				})}
			</div>
		</DisclosureRow>
	)
}
