import classNames from 'classnames'

interface Props {
	className?: string
	collapsed?: boolean
}

export function Extension({ className, collapsed = false }: Props) {
	if (collapsed) return null
	return (
		<aside
			className={classNames(
				'flex h-full w-full items-center justify-center bg-app text-fg-3 text-sm',
				className,
			)}
		>
			extension
		</aside>
	)
}
