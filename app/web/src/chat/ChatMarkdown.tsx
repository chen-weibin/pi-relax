import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import classNames from 'classnames'
import { Streamdown } from 'streamdown'
import 'katex/dist/katex.min.css'
import 'streamdown/styles.css'

/** 这一拍新露出的字一起淡入。逐字节奏在 pace，不在这里排队。 */
const streamFade = {
	animation: 'fadeIn',
	duration: 200,
	easing: 'ease-out',
	sep: 'char',
	stagger: 0,
} as const

const controls = {
	code: { copy: true, download: false },
	mermaid: { download: false },
} as const

/** 流式期就有代码外壳。Mermaid 等这段结束再挂。 */
const streamingPlugins = { code, math, cjk } as const
const settledPlugins = { code, mermaid, math, cjk } as const

export type ChatMarkdownProps = {
	text: string
	/** 这一块在眼前流过。结束后仍走分块 DOM，不切 static。 */
	live: boolean
	streaming: boolean
	isAnimating?: boolean
	className?: string
}

export function ChatMarkdown({ text, live, streaming, isAnimating = false, className }: ChatMarkdownProps) {
	const flowing = live && streaming
	return (
		<div className={classNames('markdown-view text-fg text-base', className)}>
			<Streamdown
				mode={live ? 'streaming' : 'static'}
				isAnimating={flowing && isAnimating}
				animated={flowing && isAnimating ? streamFade : false}
				lineNumbers
				codeBlockMaxHeight={0}
				controls={controls}
				plugins={flowing ? streamingPlugins : settledPlugins}
				shikiTheme={['github-light', 'github-dark']}
				mermaid={{ config: { theme: 'dark' } }}
				parseIncompleteMarkdown={flowing}
			>
				{text}
			</Streamdown>
		</div>
	)
}
