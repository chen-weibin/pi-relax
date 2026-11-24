import classNames from 'classnames'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'text'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonTone = 'neutral' | 'inverse' | 'brand'

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
	sm: 'h-6 rounded-[var(--pg-radius-sm)] px-2 text-[length:var(--pg-font-sm)] [&_svg]:h-3 [&_svg]:w-3',
	md: 'h-[30px] rounded-[var(--pg-radius-md)] px-2.5 text-[length:var(--pg-font-base)] [&_svg]:h-3.5 [&_svg]:w-3.5',
	lg: 'h-9 rounded-[var(--pg-radius-lg)] px-3 text-[length:var(--pg-font-lg)] [&_svg]:h-4 [&_svg]:w-4',
}

const clusterGap: Record<ButtonSize, string> = {
	sm: 'gap-1',
	md: 'gap-1.5',
	lg: 'gap-2',
}

const toneClasses: Record<ButtonTone, Record<ButtonVariant, string>> = {
	neutral: {
		solid: 'bg-surface-hover text-fg hover:bg-surface-active active:bg-surface-active',
		outline:
			'border border-border-hover bg-transparent text-fg hover:bg-surface-hover',
		ghost: 'text-fg-2 hover:bg-surface-hover hover:text-fg',
		text: 'text-fg-2 hover:text-fg-bright',
	},
	inverse: {
		solid: 'bg-fg text-app hover:bg-fg-bright',
		outline: 'border border-fg bg-transparent text-fg hover:bg-fg/10',
		ghost: 'text-fg hover:bg-fg/10',
		text: 'text-fg hover:text-fg-bright',
	},
	brand: {
		solid:
			'bg-brand text-on-brand shadow-[var(--pg-shadow-sm)] hover:bg-brand-hover active:bg-brand-active dark:bg-brand-soft dark:text-brand dark:shadow-none dark:hover:bg-brand-soft-hover dark:active:bg-brand-soft-hover',
		outline: 'border border-brand bg-transparent text-brand hover:bg-brand-soft',
		ghost: 'text-brand hover:bg-brand-soft',
		text: 'text-brand hover:text-brand-hover',
	},
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		className,
		type = 'button',
		variant = 'solid',
		size = 'md',
		tone = 'brand',
		block = false,
		prefix,
		suffix,
		disabled,
		children,
		...rest
	},
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			disabled={disabled}
			className={classNames(
				'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap font-normal leading-none transition-[color,background-color,box-shadow,transform] duration-[var(--pg-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50',
				sizeClasses[size],
				toneClasses[tone][variant],
				block && 'w-full',
				className,
			)}
			{...rest}
		>
			<span className={classNames('inline-flex items-center', clusterGap[size])}>
				{prefix}
				{children}
				{suffix}
			</span>
		</button>
	)
})
