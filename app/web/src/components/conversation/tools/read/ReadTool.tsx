import { useMemo } from 'react'
import { toolOpeningTitle } from '../../../../conversation/toolOpening'
import { parseToolArguments } from '../../../../conversation/toolText'
import { TitleRow } from '../../../../ui/TitleRow'
import type { ToolRendererProps } from '../types'
import { parseReadArgs } from './readArgs'

/**
 * read 专属渲染。
 *
 * 一行「查看文件 + 文件名 + 行号」，不可展开。整行走 TitleRow，目前点击只把 path / offset / limit 打到控制台。
 */
export function ReadTool({ block }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const { path, name, offset, limit, lineLabel } = useMemo(() => parseReadArgs(args), [args])
	const desc = [name, lineLabel].filter(Boolean).join(' ')

	return (
		<TitleRow
			title={toolOpeningTitle(block.data.name)}
			desc={desc || undefined}
			shimmer={streaming}
			onClick={() => {
				console.log({ path, offset, limit })
			}}
		/>
	)
}
