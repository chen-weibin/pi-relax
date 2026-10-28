import classNames from 'classnames'
import { createElement, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import { Tooltip } from './Tooltip'

export const textColors = [
	'fg',
	'fg-bright',
	'fg-2',
	'fg-3',
	'fg-disabled',
	'accent',
	'success',
	'error',
	'warning',
	'info',
] as const

export type TextColor = (typeof textColors)[number]

export const textLeadings = ['tight', 'snug', 'normal', 'relaxed'] as const

export type TextLeading = (typeof textLeadings)[number]

export const textColorClass: Record<TextColor, string> = {
	fg: 'text-fg',
	'fg-bright': 'text-fg-bright',
	'fg-2': 'text-fg-2',
	'fg-3': 'text-fg-3',
	'fg-disabled': 'text-fg-disabled',
	accent: 'text-accent',
	success: 'text-success',
	error: 'text-error',
	warning: 'text-warning',
	info: 'text-info',
}

export const textLeadingClass: Record<TextLeading, string> = {
	tight: 'leading-tight',
	snug: 'leading-snug',
	normal: 'leading-normal',
	relaxed: 'leading-relaxed',
}

/** `true` and `1` are one line. `2+` clamps to that many lines. Anything else wraps. */
export function ellipsisLines(ellipsis: boolean | number | undefined): number {
	if (ellipsis === true) return 1
	if (typeof ellipsis === 'number' && ellipsis >= 1) return Math.floor(ellipsis)
	return 0
}

export function textLayout(block: boolean, lines: number): { className: string; style?: CSSProperties } {
	if (lines <= 0) {
		return { className: classNames(block ? 'w-full' : 'inline', 'wrap-break-word') }
	}
	if (lines === 1) {
		return { className: classNames('min-w-0 truncate', block ? 'w-full' : 'inline-block max-w-full') }
	}
	return {
		className: classNames('min-w-0 overflow-hidden', block ? 'w-full' : 'max-w-full'),
		style: {
			display: '-webkit-box',
			WebkitBoxOrient: 'vertical',
			WebkitLineClamp: lines,
		},
	}
}

export function useIsOverflow<T extends HTMLElement>(enabled: boolean, watch: unknown) {
	const [overflow, setOverflow] = useState(false)
	const cleanup = useRef<(() => void) | null>(null)

	const ref = useCallback(
		(node: T | null) => {
			cleanup.current?.()
			cleanup.current = null
			if (!node) return
			if (!enabled) {
				setOverflow(false)
				return
			}
			// ponytail: overflow is the scroll box vs the client box. Upgrade path: measure a hidden clone if a browser reports a clamped scrollHeight.
			const check = () => {
				setOverflow(node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight)
			}
			check()
			const observer = new ResizeObserver(check)
			observer.observe(node)
			cleanup.current = () => observer.disconnect()
		},
		[enabled, watch],
	)

	useEffect(() => () => cleanup.current?.(), [])

	return { ref, overflow }
}

export function withFullTextTooltip(node: ReactElement, text: string) {
	return createElement(Tooltip, {
		title: createElement('span', { className: 'block max-w-xs wrap-break-word whitespace-normal' }, text),
		children: node,
	})
}
