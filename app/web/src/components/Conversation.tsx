interface Props {
	className?: string
	onToggleSidebar: () => void
	onToggleExtension: () => void
	sidebarOpen: boolean
	extensionOpen: boolean
}

function IconButton({
	onClick,
	title,
	children,
}: {
	onClick: () => void
	title: string
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			aria-label={title}
			className="cursor-pointer rounded-md p-1.5 text-fg-2 hover:bg-surface-hover hover:text-fg"
		>
			{children}
		</button>
	)
}

function PanelLeftIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
			<rect x="2" y="3" width="12" height="10" rx="1.5" />
			<line x1="6" y1="3" x2="6" y2="13" />
		</svg>
	)
}

function PanelRightIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
			<rect x="2" y="3" width="12" height="10" rx="1.5" />
			<line x1="10" y1="3" x2="10" y2="13" />
		</svg>
	)
}

export function Conversation({
	className,
	onToggleSidebar,
	onToggleExtension,
	sidebarOpen,
	extensionOpen,
}: Props) {
	return (
		<div className={`flex h-full w-full flex-col bg-app text-fg-3 text-sm ${className ?? ''}`}>
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<div className="text-fg-2 text-sm">conversation</div>
				<div className="flex gap-1">
					<IconButton
						onClick={onToggleSidebar}
						title={sidebarOpen ? '收起左侧栏' : '展开左侧栏'}
					>
						<PanelLeftIcon />
					</IconButton>
					<IconButton
						onClick={onToggleExtension}
						title={extensionOpen ? '收起右侧栏' : '展开右侧栏'}
					>
						<PanelRightIcon />
					</IconButton>
				</div>
			</div>
			<div className="flex flex-1 items-center justify-center">conversation</div>
		</div>
	)
}
