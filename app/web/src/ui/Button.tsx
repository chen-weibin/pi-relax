import classNames from 'classnames'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Spinner } from './Spinner'

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
	/** Show a spinner before `prefix` and ignore clicks. */
	loading?: boolean
	/** Replaces the default spinner while `loading`. */
	loadingIcon?: ReactNode
}

const sizeClasses: Record<ButtonSize, string> = {
	sm: 'h-6 rounded-sm px-2 text-sm [&_svg]:h-3 [&_svg]:w-3',
	md: 'h-[30px] rounded-md px-2.5 text-base [&_svg]:h-3.5 [&_svg]:w-3.5',
	lg: 'h-9 rounded-lg px-3 text-lg [&_svg]:h-4 [&_svg]:w-4',
}

const clusterGap: Record<ButtonSize, string> = {
	sm: 'gap-1',
	md: 'gap-1.5',
	lg: 'gap-2',
}

const loaderPad: Record<ButtonSize, string> = {
	sm: 'pr-1',
	md: 'pr-1.5',
	lg: 'pr-2',
}

const spinnerSize: Record<ButtonSize, number> = {
	sm: 12,
	md: 14,
	lg: 16,
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
		loading = false,
		loadingIcon,
		disabled,
		children,
		...rest
	},
	ref,
) {
	const locked = Boolean(disabled) || loading
	return (
		<button
			ref={ref}
			type={type}
			disabled={locked}
			aria-busy={loading || undefined}
			className={classNames(
				'inline-flex cursor-pointer items-center justify-center transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50',
				sizeClasses[size],
				toneClasses[tone][variant],
				block && 'w-full',
				loading && !disabled && 'disabled:opacity-100',
				className,
			)}
			{...rest}
		>
			<span
				className={classNames(
					'inline-grid shrink-0 transition-[grid-template-columns,opacity] duration-200 ease-out motion-reduce:transition-none',
					loading ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0',
				)}
			>
				<span className="min-w-0 overflow-hidden">
					<span className={classNames('flex', loaderPad[size])}>
						{loadingIcon ?? <Spinner size={spinnerSize[size]} />}
					</span>
				</span>
			</span>
			<span className={classNames('inline-flex items-center', clusterGap[size])}>
				{prefix}
				{children}
				{suffix}
			</span>
		</button>
	)
})
