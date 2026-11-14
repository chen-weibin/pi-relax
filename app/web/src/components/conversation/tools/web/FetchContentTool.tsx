import { useMemo } from 'react'
import { toolOpeningTitle } from '../../../../conversation/toolOpening'
import { parseToolArguments } from '../../../../conversation/toolText'
import { ShinyText } from '../../../../ui/ShinyText'
import type { ToolRendererProps } from '../types'
import { argumentUrls } from './webResult'

function openable(url: string): boolean {
	return /^https?:\/\//.test(url)
}

/** 抓取网页：一行标题 + 可点 URL。点击新标签打开，不展示正文。 */
export function FetchContentTool({ block }: ToolRendererProps) {
	const streaming = block.contentPhase === 'open'
	const args = useMemo(() => parseToolArguments(block.data.argumentsText), [block.data.argumentsText])
	const urls = argumentUrls(args)
	const title = toolOpeningTitle('fetch_content')

	return (
		<div className="flex w-full min-w-0 items-center whitespace-nowrap rounded-sm py-0.5 text-left">
			<span className="shrink-0 text-base text-fg-3">
				{streaming ? <ShinyText text={title} speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" /> : title}
			</span>
			{urls.map((url, index) =>
				openable(url) ? (
					<a
						key={`${url}-${index}`}
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="ml-2 min-w-0 cursor-pointer truncate text-base text-fg-disabled hover:text-fg-3 hover:underline"
					>
						{url}
					</a>
				) : (
					<span key={`${url}-${index}`} className="ml-2 min-w-0 truncate text-base text-fg-disabled">
						{url}
					</span>
				),
			)}
		</div>
	)
}
