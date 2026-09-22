import classNames from 'classnames'
import type { ReactNode } from 'react'

export type PaneHeaderProps = {
	left?: ReactNode
	right?: ReactNode
	className?: string
}

export function PaneHeader({ left, right, className }: PaneHeaderProps) {
	return (
		<div
			className={classNames(
				'flex h-[38px] shrink-0 items-center justify-between gap-2 border-b border-border pl-2 pr-3',
				className,
			)}
		>
			<div className="flex min-w-0 flex-1 items-center">{left}</div>
			<div className="flex shrink-0 items-center">{right}</div>
		</div>
	)
}
