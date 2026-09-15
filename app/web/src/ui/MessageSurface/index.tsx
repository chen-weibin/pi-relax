import classNames from 'classnames'
import type { ReactNode } from 'react'
import './index.css'

export type MessageSurfaceProps = {
	children: ReactNode
	className?: string
}

export function MessageSurface({ children, className }: MessageSurfaceProps) {
	return (
		<div className={classNames('message-surface text-fg text-base', className)}>
			{children}
		</div>
	)
}
