import { useRef, useState, type ReactNode, type KeyboardEvent, type PointerEvent } from 'react'
import classNames from 'classnames'

export interface ProgressBarProps {
	value?: number
	defaultValue?: number
	onChange?: (value: number) => void
	min?: number
	max?: number
	step?: number
	disabled?: boolean

	showValue?: boolean
	renderValue?: (value: number, percent: number) => ReactNode
	valuePosition?: 'before' | 'after'

	block?: boolean
	width?: number | string
	filled?: boolean

	ariaLabel?: string
	className?: string
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const snap = (n: number, lo: number, step: number) => lo + Math.round((n - lo) / step) * step
const percent = (v: number, lo: number, hi: number) =>
	hi === lo ? 0 : ((v - lo) / (hi - lo)) * 100
const valueFromPointer = (
	ratio: number,
	lo: number,
	hi: number,
	step: number,
): number => clamp(snap(lo + ratio * (hi - lo), lo, step), lo, hi)

export function ProgressBar({
	value,
	defaultValue,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	disabled,
	showValue = true,
	renderValue,
	valuePosition = 'after',
	block,
	width,
	filled = true,
	ariaLabel,
	className,
}: ProgressBarProps) {
	const wrapperStyle =
		width !== undefined
			? { width: typeof width === 'number' ? `${width}px` : width }
			: undefined
	const wrapperIsBlock = block || width !== undefined
	const [internal, setInternal] = useState<number>(defaultValue ?? min)
	const isControlled = value !== undefined
	const rawCurrent = isControlled ? value : internal
	const current = clamp(rawCurrent, min, max)
	const pct = percent(current, min, max)

	const trackRef = useRef<HTMLDivElement>(null)
	const bigStep = Math.max(step, (max - min) / 10)

	const commit = (next: number) => {
		const clamped = clamp(next, min, max)
		if (clamped === current) return
		if (!isControlled) setInternal(clamped)
		onChange?.(clamped)
	}

	const updateFromClientX = (clientX: number) => {
		if (disabled) return
		const track = trackRef.current
		if (!track) return
		const rect = track.getBoundingClientRect()
		if (rect.width === 0) return
		const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
		commit(valueFromPointer(ratio, min, max, step))
	}

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (disabled) return
		if (e.button !== 0 && e.pointerType === 'mouse') return
		e.preventDefault()
		e.currentTarget.setPointerCapture(e.pointerId)
		updateFromClientX(e.clientX)
	}

	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (disabled) return
		if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
		updateFromClientX(e.clientX)
	}

	const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId)
		}
	}

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return
		let next: number | null = null
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				next = current - step
				break
			case 'ArrowRight':
			case 'ArrowUp':
				next = current + step
				break
			case 'Home':
				next = min
				break
			case 'End':
				next = max
				break
			case 'PageDown':
				next = current - bigStep
				break
			case 'PageUp':
				next = current + bigStep
				break
		}
		if (next === null) return
		e.preventDefault()
		commit(clamp(snap(next, min, step), min, max))
	}

	const valueSlot = (
		<span className="text-right text-md tabular-nums text-fg-2">
			{renderValue ? renderValue(current, pct) : `${Math.round(pct)}%`}
		</span>
	)

	return (
		<span
			style={wrapperStyle}
			className={classNames(
				wrapperIsBlock ? 'flex' : 'inline-flex',
				'h-[26px] items-center gap-2',
				block ? 'w-full' : width === undefined && 'w-[100px]',
				disabled && 'opacity-50',
				className,
			)}
		>
			{showValue && valuePosition === 'before' && valueSlot}
			<div
				ref={trackRef}
				role="slider"
				tabIndex={disabled ? -1 : 0}
				aria-label={ariaLabel}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={current}
				aria-disabled={disabled || undefined}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				onKeyDown={onKeyDown}
				className="relative flex h-3 flex-1 cursor-pointer touch-none select-none items-center"
			>
				<div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-hover" />
				{filled && (
					<div
						className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-fg-3"
						style={{ width: `${pct}%` }}
					/>
				)}
				<div
					className="relative h-3 w-3 rounded-full bg-fg-2 shadow transition-colors hover:bg-fg-bright focus-visible:bg-fg-bright"
					style={{ left: `calc(${pct}% - 6px)` }}
				/>
			</div>
			{showValue && valuePosition === 'after' && valueSlot}
		</span>
	)
}