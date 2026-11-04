import classNames from 'classnames'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'text'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonTone = 'neutral' | 'inverse'

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'prefix'> & {
	variant?: ButtonVariant
	size?: ButtonSize
	tone?: ButtonTone
	/** Stretch to the container width. Content stays centered. */
	block?: boolean
	prefix?: ReactNode
	suffix?: ReactNode
}

const sizeClasses: Record<ButtonSize, string> = {
	sm: 'h-6 gap-1 rounded-sm px-2 text-sm [&_svg]:h-3 [&_svg]:w-3',
	md: 'h-[30px] gap-1.5 rounded-md px-2.5 text-md [&_svg]:h-3.5 [&_svg]:w-3.5',
	lg: 'h-9 gap-2 rounded-lg px-3 text-md [&_svg]:h-4 [&_svg]:w-4',
}

const toneClasses: Record<ButtonTone, Record<ButtonVariant, string>> = {
	neutral: {
		solid: 'bg-surface text-fg hover:bg-surface-hover active:bg-surface-active',
		outline:
			'border border-border bg-transparent text-fg-2 hover:border-border-hover hover:bg-surface-hover hover:text-fg',
		ghost: 'text-fg-2 hover:bg-surface-hover hover:text-fg',
		text: 'text-fg-2 hover:text-fg-bright',
	},
	inverse: {
		solid: 'bg-fg text-app hover:bg-fg-bright',
		outline: 'border border-fg bg-transparent text-fg hover:bg-fg/10',
		ghost: 'text-fg hover:bg-fg/10',
		text: 'text-fg hover:text-fg-bright',
	},
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		className,
		type = 'button',
		variant = 'solid',
		size = 'md',
		tone = 'neutral',
		block = false,
		prefix,
		suffix,
		children,
		...rest
	},
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			className={classNames(
				'inline-flex cursor-pointer items-center justify-center transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50',
				sizeClasses[size],
				toneClasses[tone][variant],
				block && 'w-full',
				className,
			)}
			{...rest}
		>
			{prefix}
			{children}
			{suffix}
		</button>
	)
})
