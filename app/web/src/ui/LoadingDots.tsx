import classNames from 'classnames'
import './LoadingDots.css'

export type LoadingDotsVariant = 'bounce' | 'fade' | 'pulse'
export type LoadingDotsColor = 'muted' | 'accent' | (string & {})

export type LoadingDotsProps = {
	variant?: LoadingDotsVariant
	color?: LoadingDotsColor
	className?: string
	label?: string
}

const COLOR_PRESETS: Record<'muted' | 'accent', string> = {
	muted: 'var(--fg-3)',
	accent: 'var(--accent)',
}

function resolveColor(c: LoadingDotsColor | undefined): string {
	if (c === 'muted') return COLOR_PRESETS.muted
	if (c === 'accent') return COLOR_PRESETS.accent
	if (!c) return COLOR_PRESETS.muted
	return c
}

const VARIANT_CLASS: Record<LoadingDotsVariant, string> = {
	bounce: 'loading-dots--bounce',
	fade: 'loading-dots--fade',
	pulse: 'loading-dots--pulse',
}

export function LoadingDots({
	variant = 'bounce',
	color,
	className,
	label = 'Loading',
}: LoadingDotsProps) {
	return (
		<span
			role="status"
			aria-label={label}
			className={classNames('loading-dots', VARIANT_CLASS[variant], className)}
			style={{ color: resolveColor(color) }}
		>
			<span className="loading-dots__dot" />
			<span className="loading-dots__dot" />
			<span className="loading-dots__dot" />
		</span>
	)
}
