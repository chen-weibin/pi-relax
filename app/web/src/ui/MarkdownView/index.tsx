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

export type MarkdownViewProps = {
	text: string
	mode?: 'static' | 'streaming'
	isAnimating?: boolean
	className?: string
}

export function MarkdownView({
	text,
	mode = 'static',
	isAnimating = false,
	className,
}: MarkdownViewProps) {
	return (
		<div className={classNames('markdown-view text-fg text-base', className)}>
			<Streamdown
				mode={mode}
				isAnimating={isAnimating}
				animated={false}
				lineNumbers
				codeBlockMaxHeight={0}
				controls={controls}
				plugins={plugins}
				shikiTheme={['github-light', 'github-dark']}
				mermaid={{ config: { theme: 'dark' } }}
				parseIncompleteMarkdown={mode === 'streaming'}
			>
				{text}
			</Streamdown>
		</div>
	)
}
