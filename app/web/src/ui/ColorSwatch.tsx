import classNames from 'classnames'
import {
	useId,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
} from 'react'

export type ColorSwatchSize = 'sm' | 'md' | 'lg'
export type ColorSwatchVariant = 'hollow' | 'solid'

export type ColorSwatchProps = {
	/** Controlled selected color (`#rrggbb`). */
	value?: string
	/** Uncontrolled initial color. */
	defaultValue?: string
	onChange?: (color: string) => void
	/** Override the default 7 swatches. */
	colors?: readonly string[]
	/** Show a native color input after the presets. Default true. */
	custom?: boolean
	/** Hollow color ring (default) or solid center fill. */
	variant?: ColorSwatchVariant
	/** Preset size, or outer diameter in px. */
	size?: ColorSwatchSize | number
	disabled?: boolean
	className?: string
	style?: CSSProperties
	/** Applied to each swatch button. */
	itemClassName?: string
	/** Accessible name for the group. */
	'aria-label'?: string
}

/** Default body colors aligned with `avatarPalettes`. */
export const DEFAULT_SWATCH_COLORS = [
	'#f4f4f1',
	'#c4f0d8',
	'#ffd6bf',
	'#dcd4ff',
	'#cbe6ff',
	'#fff1a6',
	'#2c2c2e',
] as const

export const colorSwatchSizes: Record<ColorSwatchSize, number> = {
	sm: 24,
	md: 28,
	lg: 32,
}

const STEPS = new Map([
	['ArrowRight', 1],
	['ArrowDown', 1],
	['ArrowLeft', -1],
	['ArrowUp', -1],
])

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v)
const norm = (v: string) => (isHex(v) ? v.toLowerCase() : v)

// Match Avatar uidoc palette: body disk = 50% outer, face/hole ≈ 43% of disk (md 28→14→6).
function diskMetrics(px: number) {
	const diameter = Math.round(px * 0.5)
	const hole = Math.round(diameter * (6 / 14))
	const ring = Math.max(2, Math.round((diameter - hole) / 2))
	return { diameter, ring }
}

function Dot({
	color,
	px,
	variant,
}: {
	color: string
	px: number
	variant: ColorSwatchVariant
}) {
	const { diameter, ring } = diskMetrics(px)
	if (variant === 'solid') {
		return (
			<span
				aria-hidden
				className="rounded-full"
				style={{ width: diameter, height: diameter, background: color }}
			/>
		)
	}
	return (
		<span
			aria-hidden
			className="rounded-full bg-transparent"
			style={{
				width: diameter,
				height: diameter,
				borderWidth: ring,
				borderStyle: 'solid',
				borderColor: color,
			}}
		/>
	)
}

function CustomGlyph({ px, variant }: { px: number; variant: ColorSwatchVariant }) {
	const { diameter, ring } = diskMetrics(px)
	const gradient =
		'conic-gradient(from 90deg, #ff6b6b, #ffd166, #6bcb77, #4d96ff, #c77dff, #ff6b6b)'
	if (variant === 'solid') {
		return (
			<span
				aria-hidden
				className="rounded-full"
				style={{ width: diameter, height: diameter, background: gradient }}
			/>
		)
	}
	return (
		<span
			aria-hidden
			className="rounded-full"
			style={{
				width: diameter,
				height: diameter,
				borderWidth: ring,
				borderStyle: 'solid',
				borderColor: 'transparent',
				background: `padding-box transparent, border-box ${gradient}`,
				backgroundOrigin: 'border-box',
				backgroundClip: 'padding-box, border-box',
			}}
		/>
	)
}

export function ColorSwatch({
	value,
	defaultValue,
	onChange,
	colors = DEFAULT_SWATCH_COLORS,
	custom = true,
	variant = 'hollow',
	size = 'md',
	disabled,
	className,
	style,
	itemClassName,
	'aria-label': ariaLabel = '颜色',
}: ColorSwatchProps) {
	const groupId = useId()
	const inputRef = useRef<HTMLInputElement>(null)
	const items = useRef<(HTMLButtonElement | null)[]>([])
	const [uncontrolled, setUncontrolled] = useState(() =>
		norm(defaultValue ?? colors[0] ?? '#f4f4f1'),
	)

	const selected = norm(value === undefined ? uncontrolled : value)
	const presets = colors.map(norm)
	const isCustomSelected = custom && !presets.includes(selected)
	const total = presets.length + (custom ? 1 : 0)
	const px = typeof size === 'number' ? size : colorSwatchSizes[size]

	const select = (next: string) => {
		if (disabled || !isHex(next)) return
		const color = norm(next)
		if (color === selected) return
		if (value === undefined) setUncontrolled(color)
		onChange?.(color)
	}

	const selectedIndex = isCustomSelected
		? presets.length
		: presets.findIndex((c) => c === selected)

	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (disabled || total === 0) return
		let target: number
		if (event.key === 'Home') target = 0
		else if (event.key === 'End') target = total - 1
		else {
			const step = STEPS.get(event.key)
			if (!step) return
			target = (index + step + total) % total
		}
		event.preventDefault()
		items.current[target]?.focus()
		if (target < presets.length) select(presets[target]!)
		else inputRef.current?.click()
	}

	const swatchClass = (active: boolean) =>
		classNames(
			'relative inline-grid place-items-center rounded-full border bg-transparent p-0',
			'transition-colors duration-150 motion-reduce:transition-none',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-app',
			disabled ? 'cursor-default opacity-50' : 'cursor-pointer',
			// Selected: same outer diameter, only the border brightens.
			active ? 'border-fg-2' : 'border-border',
			itemClassName,
		)

	return (
		<div
			role="radiogroup"
			aria-label={ariaLabel}
			aria-disabled={disabled || undefined}
			className={classNames('inline-flex flex-wrap items-center gap-2', className)}
			style={style}
		>
			{presets.map((color, index) => {
				const active = !isCustomSelected && color === selected
				return (
					<button
						key={`${groupId}-${color}`}
						ref={(node) => {
							items.current[index] = node
						}}
						type="button"
						role="radio"
						aria-checked={active}
						aria-label={color}
						disabled={disabled}
						tabIndex={disabled ? -1 : selectedIndex === index || (selectedIndex < 0 && index === 0) ? 0 : -1}
						className={swatchClass(active)}
						style={{ width: px, height: px }}
						onClick={() => select(color)}
						onKeyDown={(event) => onKeyDown(event, index)}
					>
						<Dot color={color} px={px} variant={variant} />
					</button>
				)
			})}
			{custom ? (
				<button
					ref={(node) => {
						items.current[presets.length] = node
					}}
					type="button"
					role="radio"
					aria-checked={isCustomSelected}
					aria-label={isCustomSelected ? `自定义 ${selected}` : '自定义颜色'}
					disabled={disabled}
					tabIndex={disabled ? -1 : selectedIndex === presets.length || (selectedIndex < 0 && presets.length === 0) ? 0 : -1}
					className={classNames(swatchClass(isCustomSelected), 'relative overflow-hidden')}
					style={{ width: px, height: px }}
					onClick={() => inputRef.current?.click()}
					onKeyDown={(event) => onKeyDown(event, presets.length)}
				>
					{isCustomSelected ? (
						<Dot color={selected} px={px} variant={variant} />
					) : (
						<CustomGlyph px={px} variant={variant} />
					)}
					<input
						ref={inputRef}
						type="color"
						value={isHex(selected) ? selected : '#ffffff'}
						disabled={disabled}
						tabIndex={-1}
						aria-hidden
						className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
						onChange={(event) => select(event.target.value)}
					/>
				</button>
			) : null}
		</div>
	)
}
