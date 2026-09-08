interface Props {
	onClose: () => void
}

export function Setting({ onClose }: Props) {
	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-app">
			<div className="flex items-center justify-between border-b border-border px-6 py-4">
				<div className="text-fg text-md">setting</div>
				<div
					onClick={onClose}
					className="cursor-pointer rounded-md px-3 py-1 text-fg-2 hover:bg-surface-hover hover:text-fg"
				>
					close
				</div>
			</div>
			<div className="flex flex-1 items-center justify-center text-fg-3 text-sm">
				setting
			</div>
		</div>
	)
}