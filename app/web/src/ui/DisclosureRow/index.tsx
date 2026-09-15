import type { ReactNode } from 'react'
import classNames from 'classnames'
import './index.css'

export type DisclosureRowProps = {
	title: ReactNode
	open: boolean
	onOpenChange: (open: boolean) => void
	blinking?: boolean
	disabled?: boolean
	children?: ReactNode
	className?: string
}

export function DisclosureRow({
	title,
	open,
	onOpenChange,
	blinking = false,
	disabled = false,
	children,
	className,
}: DisclosureRowProps) {
	return (
		<div className={classNames('flex flex-col gap-1', className)}>
			<button
				type="button"
				disabled={disabled}
				aria-expanded={open}
				onClick={() => onOpenChange(!open)}
				className={classNames(
					'flex items-center gap-1 rounded-sm py-0.5 text-left text-sm text-fg-3',
					disabled ? 'cursor-default' : 'cursor-pointer hover:text-fg-2',
				)}
			>
				<span
					aria-hidden
					className={classNames(
						'inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center transition-transform duration-100',
						open && 'rotate-90',
					)}
				>
					<svg width="10" height="10" viewBox="249 15 477 932" fill="currentColor">
						<path d="M311.168 97.834667a42.666667 42.666667 0 0 0-3.541333 56.32l3.541333 4.010666L664.917333 512 311.168 865.706667a42.666667 42.666667 0 0 0-3.541333 56.32l3.541333 4.010666a42.666667 42.666667 0 0 0 56.32 3.584l4.010667-3.541333 384-384a42.666667 42.666667 0 0 0 3.541333-56.32l-3.541333-3.968-384-384a42.666667 42.666667 0 0 0-60.330667 0z" />
					</svg>
				</span>
				<span className={classNames(blinking && 'disclosure-title-blink')}>{title}</span>
			</button>
			{open ? children : null}
		</div>
	)
}
