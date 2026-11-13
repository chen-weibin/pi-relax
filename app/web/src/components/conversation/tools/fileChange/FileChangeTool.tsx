import { useEffect, useMemo, useState } from 'react'
import { parseToolArguments } from '../../../../conversation/toolText'
import { DiffView } from '../../../../ui/DiffView'
import { DisclosureRow } from '../../../../ui/DisclosureRow'
import { PathLink } from '../../../../ui/PathLink'
import { ShinyText } from '../../../../ui/ShinyText'
import type { ToolRendererProps } from '../types'
import {
	countPatchStats,
	countWriteStats,
	editPatchFromDetails,
	fileBasename,
	parseFileChangeArgs,
	type DiffStats,
} from './fileChange'

function DiffStatTrail({ stats }: { stats: DiffStats | null }) {
	if (!stats) return null
	const { additions, deletions } = stats
	if (additions === 0 && deletions === 0) return null
	return (
		<span className="ml-2 inline-flex items-center gap-1 font-mono text-sm">
			{deletions > 0 || additions === 0 ? <span className="text-error">−{deletions}</span> : null}
			{additions > 0 || deletions === 0 ? <span className="text-success">+{additions}</span> : null}
		</span>
	)
}

/**
 * write / edit 共用。
 *
 * 折叠：编辑 + 可点文件名 + +n/−n。展开：DiffView（write 整文件新增，edit 用 details.patch）。
 */
export function FileChangeTool({ block, expandTick = 0 }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])

	const toolName = block.data.name
	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const parsed = useMemo(() => parseFileChangeArgs(args), [args])
	const { path, content } = parsed
	const basename = fileBasename(path) || path
	const { resultText, isError, details } = block.data
	const patch = useMemo(() => editPatchFromDetails(details), [details])

	const stats = useMemo((): DiffStats | null => {
		if (toolName === 'write' && content !== null) return countWriteStats(content)
		if (toolName === 'edit' && patch) return countPatchStats(patch)
		return null
	}, [toolName, content, patch])

	const canShowWrite = toolName === 'write' && content !== null && content !== ''
	const canShowEdit = toolName === 'edit' && patch !== null
	const hasDiff = canShowWrite || canShowEdit
	const disabled = !hasDiff && !isError

	const title = (
		<span className="inline-flex min-w-0 max-w-[60%] items-center truncate">
			{streaming ? (
				<ShinyText text="编辑" speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
			) : (
				'编辑'
			)}
			{basename ? (
				<span className="ml-2 min-w-0 truncate">
					<PathLink
						onClick={() => {
							console.log(path)
						}}
					>
						{basename}
					</PathLink>
				</span>
			) : null}
			<DiffStatTrail stats={stats} />
		</span>
	)

	return (
		<DisclosureRow title={title} open={open} chevron="hover" onOpenChange={setOpen} disabled={disabled}>
			<div className="overflow-hidden rounded-lg border border-border bg-app">
				{isError ? (
					<p className="whitespace-pre-wrap p-3 text-sm text-error">{resultText}</p>
				) : canShowWrite && content !== null ? (
					<DiffView
						source={{ kind: 'versions', old: null, new: { name: basename || 'file', contents: content } }}
						options={{ disableFileHeader: true }}
						className="overflow-hidden"
					/>
				) : canShowEdit && patch ? (
					<DiffView source={{ kind: 'patch', patch }} options={{ disableFileHeader: true }} className="overflow-hidden" />
				) : null}
			</div>
		</DisclosureRow>
	)
}
