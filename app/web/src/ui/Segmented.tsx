import classNames from 'classnames'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'

export type SegmentedSize = 'sm' | 'md' | 'lg'
export type SegmentedVariant = 'default' | 'inverse'

export type SegmentedProps<T extends string> = {
	/** 当前选中的值(受控);传了就走受控 */
	value?: T
	/** 非受控初始值;`value` 没传才生效 */
	defaultValue?: T
	/** 选项,按展示顺序 */
	options: readonly T[]
	/** 选中项变化 */
	onChange?: (next: T) => void
	/** 尺寸档位,对齐 Button 的 sm / md / lg */
	size?: SegmentedSize
	/** 胶囊样式 */
	variant?: SegmentedVariant
	disabled?: boolean
	className?: string
}

const sizeClasses: Record<SegmentedSize, { track: string; option: string; radius: string }> = {
	sm: { track: 'rounded-sm', option: 'h-6 px-2 text-sm', radius: 'rounded-xs' },
	md: { track: 'rounded-md', option: 'h-[30px] px-2.5 text-base', radius: 'rounded-sm' },
	lg: { track: 'rounded-lg', option: 'h-9 px-3 text-lg', radius: 'rounded-md' },
}

const variantClasses: Record<SegmentedVariant, { pill: string; active: string; idle: string }> = {
	default: { pill: 'bg-surface-hover', active: 'text-fg', idle: 'text-fg-3 hover:text-fg-2' },
	inverse: { pill: 'bg-fg', active: 'text-app', idle: 'text-fg-3 hover:text-fg-2' },
}

// 平滑过渡,到位即停:不过冲、不回弹
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const TWEEN = { duration: 0.24, ease: EASE }

export function Segmented<T extends string>({
	value,
	defaultValue,
	options,
	onChange,
	size = 'md',
	variant = 'default',
	disabled = false,
	className,
}: SegmentedProps<T>) {
	const trackRef = useRef<HTMLDivElement>(null)
	const optionRefs = useRef(new Map<string, HTMLButtonElement>())
	const [internal, setInternal] = useState<T | undefined>(defaultValue)
	const isControlled = value !== undefined
	const current = isControlled ? value : internal
	const valueRef = useRef(current)
	valueRef.current = current

	const x = useMotionValue(0)
	const width = useMotionValue(0)
	const reduced = Boolean(useReducedMotion())
	const mounted = useRef(false)

	// 胶囊的定位基准是 track 的内边距框(去掉 border),所以减掉 clientLeft
	const measure = () => {
		const track = trackRef.current
		const current = valueRef.current
		if (!track || current === undefined) return null
		const option = optionRefs.current.get(current)
		if (!option) return null
		const trackRect = track.getBoundingClientRect()
		const rect = option.getBoundingClientRect()
		return { x: rect.left - trackRect.left - track.clientLeft, width: rect.width }
	}

	const moveTo = (target: { x: number; width: number }, instant: boolean) => {
		if (instant) {
			animate(x, target.x, { duration: 0 })
			animate(width, target.width, { duration: 0 })
			return
		}
		animate(x, target.x, TWEEN)
		animate(width, target.width, TWEEN)
	}

	useLayoutEffect(() => {
		const target = measure()
		if (!target) return
		moveTo(target, !mounted.current || reduced)
		mounted.current = true
	}, [current, options.length, size, reduced])

	// 轨道或当前选中项尺寸变了(窗口缩放 / 文案变长),重新测量并跟上
	useEffect(() => {
		const track = trackRef.current
		const option = current === undefined ? undefined : optionRefs.current.get(current)
		if (!track) return
		const observer = new ResizeObserver(() => {
			const target = measure()
			if (!target) return
			moveTo(target, Boolean(reduced))
		})
		observer.observe(track)
		if (option) observer.observe(option)
		return () => observer.disconnect()
	}, [current, options.length, size, reduced])

	const select = (next: T) => {
		if (!isControlled) setInternal(next)
		onChange?.(next)
	}

	const sizes = sizeClasses[size]
	const variants = variantClasses[variant]

	return (
		<div
			ref={trackRef}
			className={classNames(
				'relative inline-flex items-center border border-border p-0.5',
				sizes.track,
				className,
			)}
		>
			{current !== undefined && options.includes(current) ? (
				<motion.div
					aria-hidden
					className={classNames(
						'pointer-events-none absolute left-0 top-0.5 bottom-0.5 z-0',
						sizes.radius,
						variants.pill,
					)}
					style={{ x, width }}
				/>
			) : null}
			{options.map((option) => {
				const selected = option === current
				return (
					<button
						key={option}
						ref={(node) => {
							if (node) optionRefs.current.set(option, node)
							else optionRefs.current.delete(option)
						}}
						type="button"
						aria-pressed={selected}
						disabled={disabled}
						onClick={() => select(option)}
						className={classNames(
							'relative z-10 cursor-pointer outline-none transition-colors duration-150',
							'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
							'disabled:pointer-events-none disabled:opacity-50',
							sizes.option,
							sizes.radius,
							selected ? variants.active : variants.idle,
						)}
					>
						{option}
					</button>
				)
			})}
		</div>
	)
}
