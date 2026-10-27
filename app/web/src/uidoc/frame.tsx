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

export function Segmented<T extends string>({
	value,
	options,
	onChange,
}: {
	value: T
	options: readonly T[]
	onChange: (next: T) => void
}) {
	return (
		<div className="inline-flex rounded-md border border-border p-0.5">
			{options.map((option) => (
				<button
					key={option}
					type="button"
					onClick={() => onChange(option)}
					className={classNames(
						'rounded px-2 py-1 text-sm',
						option === value ? 'bg-surface-hover text-fg' : 'text-fg-3 hover:text-fg-2',
					)}
				>
					{option}
				</button>
			))}
		</div>
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
