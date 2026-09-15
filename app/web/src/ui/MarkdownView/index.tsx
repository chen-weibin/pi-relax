import classNames from 'classnames'
import { Streamdown } from 'streamdown'
import 'streamdown/styles.css'
import './index.css'

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
				controls={false}
				lineNumbers={false}
				parseIncompleteMarkdown={mode === 'streaming'}
			>
				{text}
			</Streamdown>
		</div>
	)
}
