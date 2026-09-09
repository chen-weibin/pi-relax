import classNames from 'classnames'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type IconButtonVariant = 'ghost' | 'solid'
export type IconButtonSize = 'sm' | 'md'

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	title: string
	children: ReactNode
	variant?: IconButtonVariant
	size?: IconButtonSize
}

const variantClasses: Record<IconButtonVariant, string> = {
	ghost: 'text-fg-2 hover:bg-surface-hover hover:text-fg',
	solid: 'bg-surface text-fg hover:bg-surface-hover',
}

const sizeClasses: Record<IconButtonSize, string> = {
	sm: 'p-1',
	md: 'p-1.5',
}

export function IconButton({
	title,
	className,
	type = 'button',
	variant = 'ghost',
	size = 'md',
	children,
	...rest
}: IconButtonProps) {
	return (
		<button
			type={type}
			title={title}
			aria-label={title}
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
	)
}
