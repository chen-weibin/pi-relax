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

export type HeadingLevel = 1 | 2 | 3 | 4

export type HeadingProps = {
	level?: HeadingLevel
	color?: TextColor
	leading?: TextLeading
	/** Stretch to the container width. `false` lays the heading out inline. */
	block?: boolean
	/** `true` or `1` ellipsizes one line. `2+` clamps to that many lines. Default wraps. */
	ellipsis?: boolean | number
	/** When ellipsis is on and the text actually overflows, hover shows the full string. */
	tooltip?: boolean
	className?: string
	id?: string
	children?: ReactNode
}

const levelTag = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' } as const

const levelClass: Record<HeadingLevel, string> = {
	1: 'text-xl',
	2: 'text-lg',
	3: 'text-base',
	4: 'text-md',
}

export function Heading({
	level = 2,
	color = 'fg',
	leading = 'snug',
	block = true,
	ellipsis,
	tooltip = false,
	className,
	id,
	children,
}: HeadingProps) {
	const lines = ellipsisLines(ellipsis)
	const canTip = tooltip && lines > 0 && typeof children === 'string'
	const { ref, overflow } = useIsOverflow<HTMLHeadingElement>(canTip, children)
	const layout = textLayout(block, lines)
	const node = createElement(
		levelTag[level],
		{
			ref,
			id,
			className: classNames(
				'm-0 font-semibold',
				levelClass[level],
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
