import classNames from 'classnames'
import type { ReactNode } from 'react'
import { getSquirclePath } from './squirclePath'

export type AppIconSize = 'sm' | 'md' | 'lg'

export type AppIconProps = {
	/** Inner glyph. Required — no built-in icon. */
	icon: ReactNode
	/** Plate color. Any CSS color. */
	color: string
	/** Preset size, or a pixel number. */
	size: AppIconSize | number
	/** Accessible name. Omit for a decorative icon. */
	label?: string
	className?: string
}

export const appIconSizes: Record<AppIconSize, number> = {
	sm: 40,
	md: 52,
	lg: 64,
}

// Apple icon geometry: corner radius 22.37% of the side, Figma's iOS smoothing preset 0.6.
// Path is generated once in a 100×100 viewBox and scaled by the SVG.
const SQUIRCLE_PATH = getSquirclePath(100, 100, 100 * 0.2237, 0.6)

export function AppIcon({ icon, color, size, label, className }: AppIconProps) {
	const px = typeof size === 'number' ? size : appIconSizes[size]

	return (
		<span
			role={label ? 'img' : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			className={classNames('relative inline-flex shrink-0 items-center justify-center text-white', className)}
			style={{ width: px, height: px }}
		>
			<svg viewBox="0 0 100 100" aria-hidden focusable="false" className="absolute inset-0 h-full w-full">
				<path d={SQUIRCLE_PATH} fill={color} />
			</svg>
			<span className="absolute inset-0 inline-flex items-center justify-center [&_svg]:h-[50%] [&_svg]:w-[50%]">
				{icon}
			</span>
		</span>
	)
}
