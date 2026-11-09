import classNames from 'classnames'
import type { CSSProperties } from 'react'
import './index.css'

export type SpinnerProps = {
	/** Pixel number or any CSS length. Default `1em`. */
	size?: number | string
	/** Stroke color. Default follows `currentColor`. */
	color?: string
	className?: string
	style?: CSSProperties
}

export function Spinner({ size = '1em', color, className, style }: SpinnerProps) {
	const length = typeof size === 'number' ? `${size}px` : size
	return (
		<span
			aria-hidden
			className={classNames('spinner inline-block shrink-0', className)}
			style={{ width: length, height: length, color, ...style }}
		/>
	)
}
