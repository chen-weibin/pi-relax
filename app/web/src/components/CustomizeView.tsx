import classNames from 'classnames'

interface Props {
	className?: string
}

export function CustomizeView({ className }: Props) {
	return (
		<div
			className={classNames(
				'flex h-full w-full items-center justify-center bg-app text-fg-3 text-sm',
				className,
			)}
		>
			customize
		</div>
	)
}
