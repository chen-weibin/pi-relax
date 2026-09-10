import type { ComponentType } from 'react'
import classNames from 'classnames'

export interface SidebarActionItem {
	key: string
	icon: ComponentType
	label: string
	onClick: () => void
}

export interface SidebarActionsProps {
	/**
	 * Controlled active key. Matches an item's `key` to render active styling.
	 * Parent convention: do NOT set this to the search item's key — search
	 * is hover-only and must never show selected state.
	 */
	activeKey: string | null
	items: SidebarActionItem[]
}

export function SidebarActions({ activeKey, items }: SidebarActionsProps) {
	return (
		<div className="flex flex-col gap-0.5 px-1.5 py-2.5">
			{items.map((item) => {
				const Icon = item.icon
				const isActive = item.key === activeKey
				return (
					<button
						key={item.key}
						type="button"
						onClick={item.onClick}
						className={classNames(
							'flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-md transition-colors duration-100',
							isActive
								? 'bg-surface-active text-fg-bright'
								: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
						)}
					>
						<Icon />
						<span>{item.label}</span>
					</button>
				)
			})}
		</div>
	)
}