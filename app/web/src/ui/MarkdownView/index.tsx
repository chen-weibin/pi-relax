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
				animated={{
					animation: 'fadeIn',
					duration: 200,
					easing: 'ease',
					sep: 'char',
					stagger: 10,
					maxBacklogMs: 200,
				}}
				lineNumbers
				codeBlockMaxHeight={0}
				controls={controls}
				plugins={highlight ? plugins : plainPlugins}
				shikiTheme={['github-light', 'github-dark']}
				mermaid={{ config: { theme: 'dark' } }}
				parseIncompleteMarkdown={mode === 'streaming'}
			>
				{text}
			</Streamdown>
		</div>
	)
}
