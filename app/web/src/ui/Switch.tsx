import { useState, type MouseEvent } from 'react'
import classNames from 'classnames'

export interface SwitchProps {
	/** Controlled checked state. Pass to make the component controlled. */
	checked?: boolean
	/** Initial value for uncontrolled mode. Ignored when `checked` is provided. */
	defaultChecked?: boolean
	/** Called when user toggles. Receives the new value. */
	onChange?: (checked: boolean) => void
	disabled?: boolean
	ariaLabel?: string
	className?: string
}

export function Switch({
	checked,
	defaultChecked,
	onChange,
	disabled,
	ariaLabel,
	className,
}: SwitchProps) {
	const [internal, setInternal] = useState<boolean>(defaultChecked ?? false)
	const isControlled = checked !== undefined
	const value = isControlled ? checked : internal

	const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
		if (disabled) return
		const next = !value
		if (!isControlled) setInternal(next)
		onChange?.(next)
		e.currentTarget.blur()
	}

	return (
		<button
			type="button"
			role="switch"
			aria-checked={value}
			aria-label={ariaLabel}
			disabled={disabled}
			onClick={handleClick}
			className={classNames(
				'relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full px-0.5 transition-colors duration-200 outline-none',
				value ? 'bg-success' : 'bg-fg-disabled',
				'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
				'disabled:pointer-events-none disabled:opacity-50',
				className,
			)}
		>
			<span
				aria-hidden
				className={classNames(
					'block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
					value ? 'translate-x-[14px]' : 'translate-x-0',
				)}
			/>
		</button>
	)
}