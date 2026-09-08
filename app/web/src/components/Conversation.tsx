interface Props {
	className?: string
}

export function Conversation({ className }: Props) {
	return (
		<div className={`flex items-center justify-center bg-app text-fg-3 text-sm ${className ?? ''}`}>
			conversation
		</div>
	)
}