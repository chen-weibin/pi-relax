import { useEffect, useMemo, useState } from 'react'
import { parseToolArguments } from '../../../../conversation/toolText'
import { DisclosureRow } from '../../../../ui/DisclosureRow'
import { ShinyText } from '../../../../ui/ShinyText'
import { TrailText } from '../../../../ui/TrailText'
import type { ToolRendererProps } from '../types'

/**
 * bash / powershell 共用渲染。
 *
 * 折叠时一行「运行 + description」，description 是灰的辅文，超宽截断。
 * 展开后是一张终端样式的卡片：上面命令，下面输出。不分成功失败。
 * 提示符按工具名：powershell 用 `PS>`，其余用 `$`。
 */
export function ShellTool({ block, expandTick = 0 }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])

	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const command = typeof args?.command === 'string' ? args.command : ''
	const description = typeof args?.description === 'string' ? args.description : ''
	const { resultText } = block.data
	const prompt = block.data.name === 'powershell' ? 'PS> ' : '$ '

	const title = (
		<span className="inline-block min-w-0 max-w-[60%] truncate">
			{streaming ? (
				<ShinyText text="运行" speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
			) : (
				'运行'
			)}
			{description ? (
				<span className="ml-2">
					<TrailText text={description} />
				</span>
			) : null}
		</span>
	)

	return (
		<DisclosureRow title={title} open={open} chevron="hover" onOpenChange={setOpen}>
			{/* 背景同页面，靠边框撑出卡片。这样才有边框感。 */}
			<div className="rounded-lg border border-border bg-app p-3">
				{command ? (
					<p className="font-mono text-sm text-fg">
						<span className="text-fg-disabled">{prompt}</span>
						{command}
					</p>
				) : null}
				{resultText ? (
					<pre className="mt-2 max-h-[360px] overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-fg-3">
						{resultText}
					</pre>
				) : null}
			</div>
		</DisclosureRow>
	)
}
