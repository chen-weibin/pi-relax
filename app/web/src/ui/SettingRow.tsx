import type { ReactNode } from 'react'
import classNames from 'classnames'

export interface SettingRowProps {
	/** Left side primary text. */
	label: ReactNode
	/** Optional secondary text under the label. */
	description?: ReactNode
	/** Right side control slot (slider, toggle, dropdown, etc.). */
	children: ReactNode
	/** Optional className merged onto the outer flex container. */
	className?: string
}

export function SettingRow({
	label,
	description,
	children,
	className,
}: SettingRowProps) {
	return (
		<div
			className={classNames(
				'flex items-start justify-between gap-4',
				className,
			)}
		>
			<div className="min-w-0 flex-1">
				<div className="text-md text-fg">{label}</div>
				{description !== undefined && (
					<div className="text-sm text-fg-3">{description}</div>
				)}
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	)
}