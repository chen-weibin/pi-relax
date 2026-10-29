import type { ReactNode } from 'react'
import classNames from 'classnames'
import { Expandable } from './Expandable'
import { ShinyText } from './ShinyText'
import { ChevronRightIcon } from '../icons'

export type DisclosureChevron = 'always' | 'hover'

export type DisclosureRowProps = {
	title: ReactNode
	open: boolean
	onOpenChange: (open: boolean) => void
	blinking?: boolean
	disabled?: boolean
	/** `always` keeps the chevron visible. `hover` shows it only while the row is hovered, and always while open. Collapsing hides it immediately unless the pointer is still over the row. */
	chevron?: DisclosureChevron
	children?: ReactNode
	className?: string
	duration?: number
}

export function DisclosureRow({
	title,
	open,
	onOpenChange,
	blinking = false,
	disabled = false,
	chevron = 'always',
	children,
	className,
	duration,
}: DisclosureRowProps) {
	const titleNode =
		blinking && typeof title === 'string' ? (
			<ShinyText text={title} speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
		) : (
			title
		)

	return (
		<div className={classNames('group/disclosure flex flex-col gap-1', className)}>
			<button
				type="button"
				disabled={disabled}
				aria-expanded={open}
				onClick={() => onOpenChange(!open)}
				className={classNames(
					'flex items-center gap-1.5 rounded-sm py-0.5 text-left text-base text-fg-3',
					disabled ? 'cursor-default' : 'cursor-pointer hover:text-fg-2',
				)}
			>
				{titleNode}
				<span
					aria-hidden
					className={classNames(
						'inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center transition-transform duration-100 [&_svg]:h-2.5 [&_svg]:w-2.5',
						open && 'rotate-90',
						chevron === 'hover' && !open && 'opacity-0 group-hover/disclosure:opacity-100',
					)}
				>
					<ChevronRightIcon />
				</span>
			</button>
			<Expandable open={open} duration={duration}>
				{children}
			</Expandable>
		</div>
	)
}
