import { Children, Fragment, isValidElement, type ReactNode } from 'react'
import classNames from 'classnames'

export interface SettingGroupProps {
	/** Optional section title shown above the card. */
	title?: ReactNode
	/** Direct child rows; separators are auto-inserted between them. */
	children: ReactNode
	/** Optional className merged onto the outer section. */
	className?: string
}

export function SettingGroup({ title, children, className }: SettingGroupProps) {
	const items = Children.toArray(children).filter(isValidElement)

	return (
		<section className={classNames(className)}>
			{title !== undefined && (
				<h2 className="mb-3 text-sm font-medium text-fg-2">{title}</h2>
			)}
			<div className="rounded-xl bg-surface p-3.5">
				{items.map((item, i) => (
					<Fragment key={(item as { key?: string | null }).key ?? i}>
						{i > 0 && (
							<div
								role="separator"
								className="my-3 h-px bg-border-hover"
							/>
						)}
						{item}
					</Fragment>
				))}
			</div>
		</section>
	)
}