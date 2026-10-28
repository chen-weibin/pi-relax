import classNames from 'classnames'
import { createElement, type ReactNode } from 'react'
import {
	ellipsisLines,
	textColorClass,
	textLayout,
	textLeadingClass,
	useIsOverflow,
	withFullTextTooltip,
	type TextColor,
	type TextLeading,
} from './textStyle'

export type ParagraphSize = 'sm' | 'md' | 'base'

export type ParagraphProps = {
	size?: ParagraphSize
	color?: TextColor
	leading?: TextLeading
	/** Stretch to the container width. `false` lays the paragraph out inline. */
	block?: boolean
	/** `true` or `1` ellipsizes one line. `2+` clamps to that many lines. Default wraps. */
	ellipsis?: boolean | number
	/** When ellipsis is on and the text actually overflows, hover shows the full string. */
	tooltip?: boolean
	className?: string
	children?: ReactNode
}

const sizeClass: Record<ParagraphSize, string> = {
	sm: 'text-sm',
	md: 'text-md',
	base: 'text-base',
}

export function Paragraph({
	size = 'base',
	color = 'fg-2',
	leading = 'normal',
	block = true,
	ellipsis,
	tooltip = false,
	className,
	children,
}: ParagraphProps) {
	const lines = ellipsisLines(ellipsis)
	const canTip = tooltip && lines > 0 && typeof children === 'string'
	const { ref, overflow } = useIsOverflow<HTMLParagraphElement>(canTip, children)
	const layout = textLayout(block, lines)
	const node = createElement(
		'p',
		{
			ref,
			className: classNames(
				'm-0 font-normal',
				sizeClass[size],
				textColorClass[color],
				textLeadingClass[leading],
				layout.className,
				className,
			),
			style: layout.style,
		},
		children,
	)
	if (canTip && overflow) return withFullTextTooltip(node, children)
	return node
}
