import type { ReactNode } from 'react'
import classNames from 'classnames'
import { DotMatrix } from '../ui/DotMatrix'
import { StatusDot } from '../ui/StatusDot'
import { formatRelativeTime } from '../utils/relativeTime'

export type SessionStatus = 'loading' | 'success' | 'failure' | 'normal'

export interface SessionItemProps {
	title: string
	createdAt: number
	active?: boolean
	onClick?: () => void
	status?: SessionStatus
}

function renderStatus(status: SessionStatus): ReactNode {
	switch (status) {
		case 'loading':
			return <DotMatrix size="xs" grid="3x3" />
		case 'success':
			return <StatusDot kind="success" />
		case 'failure':
			return <StatusDot kind="failure" />
		case 'normal':
			return <StatusDot kind="normal" />
	}
}

export function SessionItem({ title, createdAt, active = false, onClick, status }: SessionItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={classNames(
				'flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md pl-2.5 pr-2.5 text-left text-sm transition-colors duration-100 select-none',
				active
					? 'bg-surface-active text-fg-bright'
					: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
			)}
		>
			<span className="flex h-full w-3.5 shrink-0 items-center justify-center">
				{status !== undefined && renderStatus(status)}
			</span>
			<span className="min-w-0 flex-1 truncate">{title}</span>
			<span className="shrink-0 text-fg-3 text-xs">{formatRelativeTime(createdAt)}</span>
		</button>
	)
}