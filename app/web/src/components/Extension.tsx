interface Props {
	className?: string
}

export function Extension({ className }: Props) {
	return (
		<aside className={`flex items-center justify-center border-l border-border bg-sidebar text-fg-3 text-sm ${className ?? ''}`}>
			extension
		</aside>
	)
}