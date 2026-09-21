import { useMemo, useState } from 'react'
import { Command } from 'cmdk'
import classNames from 'classnames'
import { PlusIcon } from '../../icons'
import { Popover } from '../../ui/Popover'
import { SearchInput } from '../../ui/SearchInput'
import { extensionPlugins } from '../registry'
import { useExtensionStore } from '../store'

export function AddPluginMenu({ className }: { className?: string }) {
	const openPlugin = useExtensionStore((s) => s.openPlugin)
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [hovered, setHovered] = useState<string | null>(null)

	const items = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return extensionPlugins
		return extensionPlugins.filter(
			(plugin) =>
				plugin.title.toLowerCase().includes(q) ||
				plugin.description.toLowerCase().includes(q) ||
				plugin.id.toLowerCase().includes(q),
		)
	}, [query])

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				if (!next) {
					setQuery('')
					setHovered(null)
				}
			}}
			placement="bottom-end"
			role="listbox"
			className="w-[220px] p-1"
			content={
				<Command shouldFilter={false} disablePointerSelection className="flex flex-col">
					<SearchInput
						variant="ghost"
						showIcon
						placeholder="打开插件…"
						value={query}
						onChange={setQuery}
					/>
					<div className="-mx-1 my-1 border-t border-border-hover" />
					<Command.List>
						{items.length === 0 && (
							<div className="px-2.5 py-1.5 text-center text-xs text-fg-3">暂无结果</div>
						)}
						<div className="flex flex-col gap-0.5">
							{items.map((plugin) => {
								const Icon = plugin.icon
								const isHovered = hovered === plugin.id
								return (
									<Command.Item
										key={plugin.id}
										value={plugin.id}
										onSelect={() => {
											openPlugin(plugin.id)
											setOpen(false)
										}}
										onPointerEnter={() => setHovered(plugin.id)}
										onPointerLeave={() => setHovered(null)}
										className={classNames(
											'flex h-[30px] cursor-pointer items-center gap-2 rounded-sm px-2.5 text-sm outline-none',
											isHovered ? 'bg-surface-hover text-fg-bright' : 'text-fg-2',
										)}
									>
										<span className="shrink-0 text-fg-3">
											<Icon />
										</span>
										<span className="min-w-0 truncate">{plugin.title}</span>
									</Command.Item>
								)
							})}
						</div>
					</Command.List>
				</Command>
			}
		>
			<button
				type="button"
				title="添加插件"
				aria-label="添加插件"
				className={classNames(
					'flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md bg-app',
					'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
					className,
				)}
			>
				<PlusIcon />
			</button>
		</Popover>
	)
}
