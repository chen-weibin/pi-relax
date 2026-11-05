import classNames from 'classnames'
import type { ReactNode } from 'react'

export type EmptyStateProps = {
	icon?: ReactNode
	children: ReactNode
	placement?: 'center' | 'top'
	className?: string
}

export function EmptyState({ icon, children, placement = 'center', className }: EmptyStateProps) {
	return (
		<div
			className={classNames(
				'flex flex-col items-center text-center text-sm text-fg-3',
				placement === 'top' ? 'px-2 pt-3' : 'h-full min-h-0 justify-center gap-2',
				className,
			)}
		>
			{icon ? <span className="[&_svg]:h-8 [&_svg]:w-8">{icon}</span> : null}
			{children}
		</div>
	)
}
