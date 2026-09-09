import { Separator } from 'react-resizable-panels'
import classNames from 'classnames'

export type ResizableHandleProps = {
	className?: string
}

export function ResizableHandle({ className }: ResizableHandleProps) {
	return (
		<div
			data-resizable-handle
			className={classNames(
				'relative w-px shrink-0 self-stretch bg-border',
				'before:absolute before:inset-y-0 before:-left-[2px] before:w-[5px]',
				'after:absolute after:inset-y-0 after:left-[-0.5px] after:w-0.5 after:bg-border-hover after:opacity-0 after:transition-opacity',
				'hover:after:opacity-100',
				className,
			)}
		>
			<Separator className="h-full" />
		</div>
	)
}
