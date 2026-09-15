import type { ReactNode } from 'react'
import classNames from 'classnames'

export type ExpandableProps = {
	open: boolean
	children: ReactNode
	className?: string
	duration?: number
}

export function Expandable({ open, children, className, duration = 200 }: ExpandableProps) {
	return (
		<div
			aria-hidden={!open}
			style={{ transitionDuration: `${duration}ms` }}
			className={classNames(
				'grid transition-[grid-template-rows] ease-out',
				open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
				className,
			)}
		>
			<div className="min-h-0 overflow-hidden">{children}</div>
		</div>
	)
}
