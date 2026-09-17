import { useState } from 'react'
import classNames from 'classnames'
import { IconButton } from './IconButton'
import { MinusIcon, PlusIcon } from '../icons'

export interface NumberStepperProps {
	value?: number
	defaultValue?: number
	onChange?: (value: number) => void
	min?: number
	max?: number
	step?: number
	disabled?: boolean
	ariaLabel?: string
	className?: string
}

const clamp = (n: number, min: number | undefined, max: number | undefined) => {
	let v = n
	if (min !== undefined && v < min) v = min
	if (max !== undefined && v > max) v = max
	return v
}

export function NumberStepper({
	value,
	defaultValue,
	onChange,
	min,
	max,
	step = 1,
	disabled,
	ariaLabel,
	className,
}: NumberStepperProps) {
	const [internal, setInternal] = useState<number>(defaultValue ?? min ?? 0)
	const isControlled = value !== undefined
	const current = isControlled ? value : internal

	const stepBy = (dir: 1 | -1) => {
		if (disabled) return
		const next = clamp(current + dir * step, min, max)
		if (next === current) return
		if (!isControlled) setInternal(next)
		onChange?.(next)
	}

	const decDisabled = disabled || (min !== undefined && current <= min)
	const incDisabled = disabled || (max !== undefined && current >= max)

	return (
		<div
			className={classNames(
				'inline-flex h-[26px] items-stretch overflow-hidden rounded-md border border-border-hover bg-surface',
				disabled && 'opacity-50',
				className,
			)}
		>
			<IconButton
				variant="ghost"
				size="sm"
				title={ariaLabel ? `${ariaLabel} 减小` : '减小'}
				aria-label={ariaLabel ? `${ariaLabel} 减小` : undefined}
				disabled={decDisabled}
				onClick={() => stepBy(-1)}
				className="rounded-none border-0 px-2 [&_svg]:h-3 [&_svg]:w-3"
			>
				<MinusIcon />
			</IconButton>
			<div
				aria-live="polite"
				className="flex min-w-[3rem] items-center justify-center px-2 text-md text-fg"
			>
				{current}
			</div>
			<IconButton
				variant="ghost"
				size="sm"
				title={ariaLabel ? `${ariaLabel} 增大` : '增大'}
				aria-label={ariaLabel ? `${ariaLabel} 增大` : undefined}
				disabled={incDisabled}
				onClick={() => stepBy(1)}
				className="rounded-none border-0 px-2 [&_svg]:h-3 [&_svg]:w-3"
			>
				<PlusIcon />
			</IconButton>
		</div>
	)
}
