interface Props {
	onOpenSetting: () => void
	collapsed?: boolean
}

export function Sidebar({ onOpenSetting, collapsed = false }: Props) {
	if (collapsed) return null
	return (
		<aside className="flex h-full w-full flex-col border-r border-border bg-sidebar">
			<div className="px-3 py-3 text-fg-2 text-sm">sidebar</div>
			<div className="mt-auto px-2 py-3">
				<div
					onClick={onOpenSetting}
					className="cursor-pointer rounded-md px-3 py-1.5 text-fg-2 hover:bg-surface-hover hover:text-fg"
				>
					setting
				</div>
			</div>
		</aside>
	)
}
