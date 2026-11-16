import classNames from 'classnames'
import {
	useRef,
	useState,
	type ComponentProps,
	type CSSProperties,
	type KeyboardEvent,
	type ReactNode,
} from 'react'
import { Tooltip } from './Tooltip'

export type ThemePalette = {
	sidebar: string
	panel: string
	border: string
	strong: string
	muted: string
	tile: string
}

export type ThemeOption = {
	value: string
	label: string
	colors: ThemePalette
	disabled?: boolean
	disabledHint?: ReactNode
}

/** Hex from `index.css` dark / light drafts — preview doesn't follow `data-theme`. */
export const DEFAULT_THEMES: ThemeOption[] = [
	{
		value: 'dark',
		label: '暗色',
		colors: {
			sidebar: '#252525',
			panel: '#151515',
			border: '#2a2a2a',
			strong: '#a1a1a1',
			muted: '#2b2b2b',
			tile: '#1c1c1c',
		},
	},
	{
		value: 'light',
		label: '亮色',
		colors: {
			sidebar: '#fafafa',
			panel: '#ffffff',
			border: '#e5e5e5',
			strong: '#4a4a4a',
			muted: '#f5f5f5',
			tile: '#f7f7f7',
		},
		disabled: true,
		disabledHint: '当前暂未实现',
	},
]

const bar = 'block h-[2.2cqw] rounded-full'

function Preview({ colors }: { colors: ThemePalette }) {
	const vars = {
		'--ts-sidebar': colors.sidebar,
		'--ts-panel': colors.panel,
		'--ts-border': colors.border,
		'--ts-strong': colors.strong,
		'--ts-muted': colors.muted,
		'--ts-tile': colors.tile,
	} as CSSProperties

	return (
		<span
			aria-hidden
			data-slot="theme-selector-preview"
			style={vars}
			className="absolute -bottom-[10cqw] -right-[10cqw] left-[13cqw] top-[13cqw] flex rounded-tl-[5cqw] bg-(--ts-sidebar) shadow-[0_0_0_1px_var(--ts-border),0_1px_2px_rgba(0,0,0,0.06)]"
		>
			<span className="flex w-[25cqw] shrink-0 flex-col px-[3cqw] pb-[14cqw] pt-[4cqw]">
				<span className="flex gap-[1.3cqw] px-[1.2cqw]">
					{[0, 1, 2].map((dot) => (
						<span
							key={dot}
							className="size-[2cqw] rounded-full bg-(--ts-muted)"
						/>
					))}
				</span>
				<span className="mt-[4cqw] flex flex-col gap-[1cqw]">
					<span className="flex h-[4.6cqw] items-center rounded-[1.6cqw] bg-(--ts-muted) px-[1.2cqw]">
						<span className={classNames(bar, 'w-[10cqw] bg-(--ts-strong)')} />
					</span>
					<span className="flex h-[4.6cqw] items-center px-[1.2cqw]">
						<span className={classNames(bar, 'w-[13cqw] bg-(--ts-muted)')} />
					</span>
					<span className="flex h-[4.6cqw] items-center px-[1.2cqw]">
						<span className={classNames(bar, 'w-[8cqw] bg-(--ts-muted)')} />
					</span>
				</span>
				<span className="mt-auto flex items-center gap-[1.6cqw] px-[1.2cqw]">
					<span className="size-[4.4cqw] shrink-0 rounded-full bg-(--ts-strong)" />
					<span className={classNames(bar, 'w-[7cqw] bg-(--ts-muted)')} />
				</span>
			</span>
			<span className="mt-[3cqw] flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-[4cqw] bg-(--ts-panel) pl-[4cqw] pt-[4cqw] shadow-[0_0_0_1px_var(--ts-border)]">
				<span className="flex flex-col gap-[1.5cqw]">
					<span className={classNames(bar, 'w-[11cqw] bg-(--ts-strong)')} />
					<span className={classNames(bar, 'w-[19cqw] bg-(--ts-muted)')} />
				</span>
				<span className="mt-[6cqw] flex gap-[4cqw]">
					{[0, 1, 2].map((tile) => (
						<span
							key={tile}
							className="h-[12cqw] w-[19cqw] shrink-0 rounded-[2.4cqw] bg-(--ts-tile) shadow-[0_0_0_1px_var(--ts-border)]"
						/>
					))}
				</span>
				<span className="mt-[6cqw] h-[20cqw] w-[70cqw] shrink-0 rounded-[2.4cqw] bg-(--ts-tile) shadow-[0_0_0_1px_var(--ts-border)]" />
			</span>
		</span>
	)
}

const STEPS = new Map([
	['ArrowRight', 1],
	['ArrowDown', 1],
	['ArrowLeft', -1],
	['ArrowUp', -1],
])

const ring =
	'pointer-events-none absolute -inset-[3.5px] rounded-[15.5px] border-[1.5px] sm:rounded-[19.5px] transition-opacity duration-150 motion-reduce:transition-none'

export type ThemeSelectorProps = Omit<
	ComponentProps<'div'>,
	'defaultValue' | 'onChange'
> & {
	themes?: ThemeOption[]
	value?: string | null
	defaultValue?: string
	onChange?: (value: string) => void
	labels?: boolean
	disabled?: boolean
	itemClassName?: string
}

function nextEnabledIndex(
	themes: ThemeOption[],
	from: number,
	step: number,
): number {
	const n = themes.length
	if (n === 0) return from
	let i = from
	for (let guard = 0; guard < n; guard++) {
		i = (i + step + n) % n
		if (!themes[i]?.disabled) return i
	}
	return from
}

export function ThemeSelector({
	themes = DEFAULT_THEMES,
	value,
	defaultValue,
	onChange,
	labels = true,
	disabled,
	className,
	itemClassName,
	...props
}: ThemeSelectorProps) {
	const [uncontrolled, setUncontrolled] = useState(
		defaultValue ?? themes.find((t) => !t.disabled)?.value ?? themes[0]?.value,
	)
	const items = useRef<(HTMLButtonElement | null)[]>([])

	const selected = value === undefined ? uncontrolled : value
	const selectedIndex = themes.findIndex((theme) => theme.value === selected)

	const select = (next: string) => {
		const option = themes.find((t) => t.value === next)
		if (!option || option.disabled || next === selected) return
		if (value === undefined) setUncontrolled(next)
		onChange?.(next)
	}

	const onKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		index: number,
	) => {
		if (disabled) return
		let target: number
		if (event.key === 'Home') {
			target = themes.findIndex((t) => !t.disabled)
			if (target < 0) return
		} else if (event.key === 'End') {
			target = -1
			for (let i = themes.length - 1; i >= 0; i--) {
				if (!themes[i]?.disabled) {
					target = i
					break
				}
			}
			if (target < 0) return
		} else {
			const step = STEPS.get(event.key)
			if (!step) return
			target = nextEnabledIndex(themes, index, step)
			if (target === index) return
		}
		event.preventDefault()
		const next = themes[target]
		if (!next) return
		items.current[target]?.focus()
		select(next.value)
	}

	return (
		<div
			role="radiogroup"
			aria-label="主题"
			aria-disabled={disabled || undefined}
			data-slot="theme-selector"
			{...props}
			className={classNames(
				'flex min-w-0 gap-5',
				disabled && 'pointer-events-none opacity-50',
				className,
			)}
		>
			{themes.map((theme, index) => {
				const active = theme.value === selected
				const itemDisabled = Boolean(disabled || theme.disabled)
				const hint =
					theme.disabled && (theme.disabledHint ?? '当前暂未实现')

				const tabIndex =
					selectedIndex === -1
						? !theme.disabled &&
							index === themes.findIndex((t) => !t.disabled)
							? 0
							: -1
						: active
							? 0
							: -1

				const button = (
					<button
						ref={(el) => {
							items.current[index] = el
						}}
						type="button"
						role="radio"
						aria-checked={active}
						aria-label={theme.label}
						aria-disabled={itemDisabled || undefined}
						tabIndex={itemDisabled ? -1 : tabIndex}
						data-slot="theme-selector-item"
						data-state={active ? 'checked' : 'unchecked'}
						onClick={() => {
							if (itemDisabled) return
							select(theme.value)
						}}
						onKeyDown={(event) => onKeyDown(event, index)}
						className={classNames(
							'group relative aspect-[4/3] w-40 max-w-full outline-none',
							itemDisabled
								? 'cursor-not-allowed opacity-50'
								: 'cursor-pointer',
							itemClassName,
						)}
					>
						<span className="@container absolute inset-0 overflow-hidden rounded-xl bg-surface transition-colors duration-150 group-hover:bg-surface-hover motion-reduce:transition-none sm:rounded-2xl">
							<Preview colors={theme.colors} />
						</span>
						<span
							className={classNames(
								ring,
								'border-border-hover opacity-0',
								!active && !itemDisabled && 'group-hover:opacity-100',
							)}
						/>
						<span
							data-slot="theme-selector-ring"
							className={classNames(
								ring,
								'border-fg',
								active ? 'opacity-100' : 'opacity-0',
							)}
						/>
						<span className="pointer-events-none absolute -inset-[7px] rounded-[19px] border-[1.5px] border-accent/0 transition-colors group-focus-visible:border-accent/60 sm:rounded-[23px]" />
					</button>
				)

				return (
					<div
						key={theme.value}
						data-slot="theme-selector-option"
						className="flex min-w-0 flex-col items-center gap-3"
					>
						{hint ? (
							<Tooltip title={hint}>{button}</Tooltip>
						) : (
							button
						)}
						{labels && (
							<span
								aria-hidden
								data-slot="theme-selector-label"
								className={classNames(
									'text-xs font-medium transition-colors duration-150 motion-reduce:transition-none',
									active ? 'text-fg-bright' : 'text-fg-3',
									itemDisabled && 'opacity-50',
								)}
							>
								{theme.label}
							</span>
						)}
					</div>
				)
			})}
		</div>
	)
}
