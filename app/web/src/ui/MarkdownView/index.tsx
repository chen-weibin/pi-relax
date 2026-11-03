import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import classNames from 'classnames'
import { Streamdown } from 'streamdown'
import 'katex/dist/katex.min.css'
import 'streamdown/styles.css'

const plugins = { code, mermaid, math, cjk } as const

const controls = {
	code: { copy: true, download: false },
	mermaid: { download: false },
} as const

const plainPlugins = { math, cjk } as const

/**
 * 只淡这一拍新到的后缀。sep 用 char，是因为无空格的中文在 word 模式下整段算已经出现过，新字不会淡入。
 * stagger 为 0：同一次渲染里的新字同一时刻开始，不逐字排队。
 */
const streamFade = {
	animation: 'fadeIn',
	duration: 120,
	easing: 'ease-out',
	sep: 'char',
	stagger: 0,
} as const

export type MarkdownViewProps = {
	text: string
	mode?: 'static' | 'streaming'
	isAnimating?: boolean
	/** 流式中关掉 Shiki 和 Mermaid。围栏先当普通文本，完成后再算。 */
	highlight?: boolean
	className?: string
}

export function MarkdownView({
	text,
	mode = 'static',
	isAnimating = false,
	highlight = true,
	className,
}: MarkdownViewProps) {
	return (
		<div className={classNames('markdown-view text-fg text-base', className)}>
			<Streamdown
				mode={mode}
				isAnimating={isAnimating}
				animated={isAnimating ? streamFade : false}
				lineNumbers
				codeBlockMaxHeight={0}
				controls={controls}
				plugins={highlight && !isAnimating ? plugins : plainPlugins}
				shikiTheme={['github-light', 'github-dark']}
				mermaid={{ config: { theme: 'dark' } }}
				parseIncompleteMarkdown={mode === 'streaming'}
			>
				{text}
			</Streamdown>
		</div>
	)
}
