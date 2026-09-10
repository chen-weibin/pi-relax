import classNames from 'classnames'
import { formatRelativeTime } from '../utils/relativeTime'

export interface SessionItemProps {
	title: string
	createdAt: number
	active?: boolean
	onClick?: () => void
}

export function SessionItem({ title, createdAt, active = false, onClick }: SessionItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={classNames(
				'flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md pl-8 pr-2.5 text-left text-sm transition-colors duration-100 select-none',
				active
					? 'bg-surface-active text-fg-bright'
					: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
			)}
		>
			<span className="min-w-0 flex-1 truncate">{title}</span>
			<span className="shrink-0 text-fg-3 text-xs">{formatRelativeTime(createdAt)}</span>
		</button>
	)
}
