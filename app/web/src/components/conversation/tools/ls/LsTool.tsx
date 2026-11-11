import { useEffect, useMemo, useState } from 'react'
import { parseToolArguments } from '../../../../conversation/toolText'
import { DisclosureRow } from '../../../../ui/DisclosureRow'
import { ShinyText } from '../../../../ui/ShinyText'
import { TrailText } from '../../../../ui/TrailText'
import type { ToolRendererProps } from '../types'
import { parseLsListing, describeLsEntries } from './lsListing'

/**
 * ls 专属渲染。
 *
 * 折叠时一行「查看资源 + 计数」。展开后是一张卡片：上面一行路径，下面每行一个条目。
 * 没有条目就没有可展开的内容：行禁用（不展开、没箭头），描述用结果里的原文。
 */
export function LsTool({ block, expandTick = 0 }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])

	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const path = typeof args?.path === 'string' ? args.path : ''
	const { resultText, isError } = block.data
	const listing = useMemo(() => parseLsListing(resultText), [resultText])
	// 出错时结果文本是错误文案，不是目录项，不能当条目数。
	const hasEntries = !isError && listing.entries.length > 0
	// 出错时错误文案在卡片里，描述不重复挂。
	const description = hasEntries ? describeLsEntries(listing.entries) : isError ? '' : resultText.trim()
	// 没有条目又没有错误可看，这一行不可展开。
	const disabled = !hasEntries && !isError

	const title = (
		<span className="inline-block min-w-0 max-w-[60%] truncate">
			{streaming ? (
				<ShinyText text="查看资源" speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
			) : (
				'查看资源'
			)}
			{description ? (
				<span className="ml-2">
					<TrailText text={description} />
				</span>
			) : null}
		</span>
	)

	return (
		<DisclosureRow title={title} open={open} chevron="hover" onOpenChange={setOpen} disabled={disabled}>
			{/* 背景同页面，靠边框撑出卡片。和 bash 一致。 */}
			<div className="rounded-lg border border-border bg-app p-3">
				{path ? (
					<p className="font-mono text-sm text-fg-2">{path}</p>
				) : (
					<p className="text-sm text-fg-3">当前工作路径</p>
				)}
				{isError ? (
					<p className="mt-2 whitespace-pre-wrap text-sm text-error">{resultText}</p>
				) : (
					<>
						{listing.entries.length > 0 ? (
							<div className="mt-2 max-h-[360px] overflow-auto font-mono text-sm">
								{listing.entries.map((entry, index) => (
									<div key={index} className={`break-words ${entry.endsWith('/') ? 'text-fg' : 'text-fg-3'}`}>
										{entry}
									</div>
								))}
							</div>
						) : null}
						{listing.notice ? <p className="mt-2 text-sm text-warning">{listing.notice}</p> : null}
					</>
				)}
			</div>
		</DisclosureRow>
	)
}
