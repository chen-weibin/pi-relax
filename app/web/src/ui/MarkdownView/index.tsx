import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import classNames from 'classnames'
import { Streamdown } from 'streamdown'
import 'katex/dist/katex.min.css'
import 'streamdown/styles.css'

const settledPlugins = { code, mermaid, math, cjk } as const

const controls = {
	code: { copy: true, download: false },
	mermaid: { download: false },
} as const

const plainPlugins = { math, cjk } as const
/** 流式期就有代码外壳。Mermaid 等这段结束再挂。 */
const streamingPlugins = { code, math, cjk } as const

/**
 * 只淡这一拍新到的后缀。sep 用 char，是因为无空格的中文在 word 模式下整段算已经出现过，新字不会淡入。
 * stagger 为 0：同一次渲染里的新字同一时刻开始，不逐字排队。
 */
const streamFade = {
	animation: 'fadeIn',
	duration: 200,
	easing: 'ease-out',
	sep: 'char',
	stagger: 0,
} as const

export type MarkdownViewProps = {
	text: string
	mode?: 'static' | 'streaming'
	isAnimating?: boolean
	/** 这一块在眼前流过。结束后仍走分块 DOM，不切 static。 */
	live?: boolean
	/** live 时表示这段是否还在写。 */
	streaming?: boolean
	/** 非 live 的旧路径：流式中关掉 Shiki 和 Mermaid。 */
	highlight?: boolean
	className?: string
}

export function MarkdownView({
	text,
	mode = 'static',
	isAnimating = false,
	live = false,
	streaming = false,
	highlight = true,
	className,
}: MarkdownViewProps) {
	const flowing = live && streaming
	const plugins = live ? (flowing ? streamingPlugins : settledPlugins) : highlight && !isAnimating ? settledPlugins : plainPlugins
	const fade = live ? flowing && isAnimating : isAnimating
	return (
		<div className={classNames('markdown-view text-fg text-base', className)}>
			<Streamdown
				mode={live || mode === 'streaming' ? 'streaming' : 'static'}
				isAnimating={fade}
				animated={fade ? streamFade : false}
				lineNumbers
				codeBlockMaxHeight={0}
				controls={controls}
				plugins={plugins}
				shikiTheme={['github-light', 'github-dark']}
				mermaid={{ config: { theme: 'dark' } }}
				parseIncompleteMarkdown={live ? flowing : mode === 'streaming'}
			>
				{text}
			</Streamdown>
		</div>
	)
}
