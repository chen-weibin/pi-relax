import { useMemo } from 'react'
import classNames from 'classnames'
import { toolOpeningTitle } from '../../../../conversation/toolOpening'
import { parseToolArguments } from '../../../../conversation/toolText'
import { FileIcon } from '../../../../icons'
import { Popover } from '../../../../ui/Popover'
import { TitleRow } from '../../../../ui/TitleRow'
import type { ToolRendererProps } from '../types'
import { parseFindResult, parseGrepResult, type SearchFileItem } from './searchResult'

/**
 * find / grep 专属渲染。
 *
 * 一行「搜索文件|搜索内容 + pattern」，不可展开。有 resultText 时 hover 出浮窗：
 * 有文件则列表；无匹配 / 错误则一行展示返回原文。点击文件项目前只 console.log。
 */
export function SearchTool({ block }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const isGrep = block.data.name === 'grep'
	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const pattern = typeof args?.pattern === 'string' ? args.pattern : ''
	const resultText = block.data.resultText ?? ''
	const hasResult = resultText !== ''

	const listing = useMemo(() => {
		if (!hasResult) return null
		return isGrep ? parseGrepResult(resultText) : parseFindResult(resultText)
	}, [hasResult, isGrep, resultText])

	const titleRow = (
		<TitleRow
			title={toolOpeningTitle(block.data.name)}
			desc={pattern || undefined}
			shimmer={streaming}
		/>
	)

	if (!hasResult || !listing) {
		return titleRow
	}

	return (
		<Popover
			trigger={['hover']}
			interactive
			placement="bottom-start"
			className="p-1"
			content={
				<SearchPopoverBody
					files={listing.files}
					emptyText={resultText.trim()}
					isError={block.data.isError}
					isGrep={isGrep}
				/>
			}
		>
			<div className="w-full min-w-0">{titleRow}</div>
		</Popover>
	)
}

function SearchPopoverBody({
	files,
	emptyText,
	isError,
	isGrep,
}: {
	files: SearchFileItem[]
	emptyText: string
	isError: boolean
	isGrep: boolean
}) {
	if (files.length === 0) {
		return (
			<div
				className={classNames(
					'min-w-[240px] max-w-[360px] px-2.5 py-1.5 text-sm',
					isError ? 'text-error' : 'text-fg-3',
				)}
			>
				{emptyText}
			</div>
		)
	}

	return (
		<div className="min-w-[240px] max-w-[360px] max-h-[300px] overflow-y-auto">
			{files.map((file) => (
				<button
					key={file.path}
					type="button"
					className="flex h-[30px] w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm px-2.5 text-left text-sm text-fg-2 outline-none hover:bg-surface-hover"
					onClick={() => {
						console.log(isGrep ? { path: file.path, matchCount: file.matchCount } : { path: file.path })
					}}
				>
					<span className="shrink-0 text-fg-3 [&_svg]:h-3.5 [&_svg]:w-3.5">
						<FileIcon />
					</span>
					<span className="min-w-0 truncate">{file.name}</span>
					{isGrep && file.matchCount != null ? (
						<span className="shrink-0 text-fg-disabled">-- {file.matchCount} 匹配</span>
					) : null}
				</button>
			))}
		</div>
	)
}
