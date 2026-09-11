import classNames from 'classnames'

interface Props {
	className?: string
}

export function CustomizeView({ className }: Props) {
	return (
		<div className={classNames('flex flex-1 items-center justify-center', className)}>
			customize
		</div>
	)
}
