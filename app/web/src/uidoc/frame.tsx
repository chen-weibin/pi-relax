import classNames from 'classnames'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function Preview({
	label,
	children,
	className,
	bodyClassName,
}: {
	label?: string
	children: ReactNode
	className?: string
	bodyClassName?: string
}) {
	return (
		<figure className={classNames('flex flex-col items-center gap-2', className)}>
			{label ? <figcaption className="text-sm text-fg-3">{label}</figcaption> : null}
			<div className={classNames('flex w-full items-center justify-center', bodyClassName)}>{children}</div>
		</figure>
	)
}

export const DemoButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
	function DemoButton({ className, type = 'button', ...rest }, ref) {
		return (
			<button
				ref={ref}
				type={type}
				className={classNames(
					'rounded-md border border-border-hover bg-surface px-3 py-1.5 text-sm text-fg hover:bg-surface-hover',
					className,
				)}
				{...rest}
			/>
		)
	},
)
