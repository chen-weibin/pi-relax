import classNames from 'classnames'
import { createContext, useContext, useState, type ReactElement } from 'react'
import type { Placement } from '@floating-ui/react'
import { CheckIcon, ChevronRightIcon } from '../icons'
import { Popover, type PopoverTrigger } from './Popover'
import { SearchInput } from './SearchInput'

export type DropdownRow = {
	id: string
	label: string
	detail?: string
	checked?: boolean
	disabled?: boolean
	onSelect?: () => void
	panel?: DropdownPanel
}

export type DropdownGroup = {
	label?: string
	rows: DropdownRow[]
}

export type DropdownPanel = {
	groups: DropdownGroup[]
	searchable?: boolean
	searchPlaceholder?: string
	width?: number
}

export type DropdownProps = {
	children: ReactElement
	panel: DropdownPanel
	placement?: Placement
	trigger?: PopoverTrigger[]
	className?: string
}

const CloseMenu = createContext<() => void>(() => {})

const rowClass =
	'flex h-[30px] w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 text-left text-sm text-fg outline-none hover:bg-surface-hover disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent'

export function Dropdown({ children, panel, placement = 'bottom-start', trigger = ['click'], className }: DropdownProps) {
	const closeParent = useContext(CloseMenu)
	const [open, setOpen] = useState(false)
	const closeAll = () => {
		setOpen(false)
		closeParent()
	}

	return (
		<CloseMenu.Provider value={closeAll}>
			<Popover
				open={open}
				onOpenChange={setOpen}
				placement={placement}
				trigger={trigger}
				interactive={trigger.includes('hover')}
				role="menu"
				width={panel.width}
				className={classNames('flex max-h-80 flex-col p-1', className)}
				content={<DropdownList panel={panel} />}
			>
				{children}
			</Popover>
		</CloseMenu.Provider>
	)
}

function DropdownList({ panel }: { panel: DropdownPanel }) {
	const [query, setQuery] = useState('')
	const needle = query.trim().toLowerCase()
	const groups = panel.searchable
		? panel.groups
				.map((group) => ({
					...group,
					rows: group.rows.filter((row) => row.label.toLowerCase().includes(needle)),
				}))
				.filter((group) => group.rows.length > 0)
		: panel.groups

	return (
		<div className={classNames('flex min-h-0 flex-col', panel.searchable && 'gap-1')}>
			{panel.searchable ? (
				<SearchInput
					value={query}
					onChange={setQuery}
					variant="ghost"
					showIcon={false}
					placeholder={panel.searchPlaceholder ?? '搜索'}
					className="w-full"
				/>
			) : null}
			{panel.searchable ? <div className="-mx-1 border-t border-border-hover" /> : null}
			<div className="flex min-h-0 flex-col overflow-y-auto">
				{groups.length === 0 ? (
					<div className="px-2.5 py-2 text-center text-xs text-fg-3">没有匹配</div>
				) : (
					groups.map((group, index) => (
						<div key={group.label ?? `group-${index}`} className={classNames(index > 0 && 'mt-1 border-t border-border pt-1')}>
							{group.label ? <div className="px-2.5 py-1 text-xs text-fg-3">{group.label}</div> : null}
							{group.rows.map((row) => (
								<DropdownEntry key={row.id} row={row} />
							))}
						</div>
					))
				)}
			</div>
		</div>
	)
}

function DropdownEntry({ row }: { row: DropdownRow }) {
	const closeAll = useContext(CloseMenu)
	if (row.panel) {
		return (
			<Dropdown panel={row.panel} placement="right-start" trigger={['hover', 'click']}>
				<button type="button" className={rowClass} disabled={row.disabled}>
					<span className="min-w-0 flex-1 truncate">{row.label}</span>
					{row.detail ? <span className="shrink-0 truncate text-fg-3">{row.detail}</span> : null}
					<span className="shrink-0 text-fg-3 [&_svg]:h-3 [&_svg]:w-3">
						<ChevronRightIcon />
					</span>
				</button>
			</Dropdown>
		)
	}
	return (
		<button
			type="button"
			className={rowClass}
			disabled={row.disabled}
			onClick={() => {
				if (row.disabled) return
				row.onSelect?.()
				closeAll()
			}}
		>
			<span className="min-w-0 flex-1 truncate">{row.label}</span>
			{row.checked ? (
				<span className="shrink-0 text-fg [&_svg]:h-3 [&_svg]:w-3">
					<CheckIcon />
				</span>
			) : null}
		</button>
	)
}
