import type { Placement } from '@floating-ui/react'
import classNames from 'classnames'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Tooltip } from './Tooltip'

export type IconButtonVariant = 'ghost' | 'solid'
export type IconButtonSize = 'sm' | 'md'

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> & {
	title?: ReactNode
	children: ReactNode
	variant?: IconButtonVariant
	size?: IconButtonSize
	tooltipPlacement?: Placement
	tooltipDelay?: number
}

const variantClasses: Record<IconButtonVariant, string> = {
	ghost: 'text-fg-2 hover:bg-surface-hover hover:text-fg',
	solid: 'bg-surface text-fg hover:bg-surface-hover',
}

const sizeClasses: Record<IconButtonSize, string> = {
	sm: 'p-1',
	md: 'inline-flex h-[26px] w-[26px] items-center justify-center',
}

export function IconButton({
	title,
	className,
	type = 'button',
	variant = 'ghost',
	size = 'md',
	children,
	tooltipPlacement = 'top',
	tooltipDelay = 400,
	'aria-label': ariaLabel,
	...rest
}: IconButtonProps) {
	const label = ariaLabel ?? (typeof title === 'string' ? title : undefined)
	return (
		<Tooltip title={title} placement={tooltipPlacement} delay={tooltipDelay}>
			<button
				type={type}
				aria-label={label}
				className={classNames(
					'cursor-pointer rounded-md disabled:pointer-events-none disabled:opacity-50',
					variantClasses[variant],
					sizeClasses[size],
					className,
				)}
				{...rest}
			>
				{children}
			</button>
		</Tooltip>
	)
}
