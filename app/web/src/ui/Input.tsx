import classNames from 'classnames'
import {
	useEffect,
	useId,
	useRef,
	useState,
	type ChangeEvent,
	type InputHTMLAttributes,
	type KeyboardEvent,
	type ReactNode,
} from 'react'
import { CloseCircleIcon } from '../icons'

export type InputSize = 'sm' | 'md' | 'lg'
export type InputStatus = 'error' | 'warning' | 'success'
/** `filled` paints `bg-surface`. `transparent` keeps the border and leaves the middle clear. */
export type InputVariant = 'filled' | 'transparent'

export type InputProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'size' | 'prefix' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
	onPressEnter?: (value: string) => void
	/** Visual height. Default `'md'` (30px, same as SearchInput / Select). */
	size?: InputSize
	/** Default `'filled'`. `'transparent'` keeps the border and a clear middle. */
	variant?: InputVariant
	status?: InputStatus
	/** Clear button on the right. Shown only when the value is non-empty. */
	allowClear?: boolean
	prefix?: ReactNode
	suffix?: ReactNode
	/** Count inside the field, on the right. With `maxLength`: `6 / 20`; otherwise `6`. */
	showCount?: boolean
	hint?: ReactNode
	/** Hint color. Defaults to `status`. */
	hintStatus?: InputStatus
	/**
	 * Keep one line of height under the field even when `hint` is empty.
	 * Default `false`: the hint is absolutely positioned and does not push siblings.
	 */
	hintReserve?: boolean
}

const FIELD_HEIGHT: Record<InputSize, string> = {
	sm: 'h-6 text-sm',
	md: 'h-[30px] text-md',
	lg: 'h-9 text-md',
}

const STATUS_FIELD: Record<InputStatus, string> = {
	error: 'border-error text-error',
	warning: 'border-warning text-warning',
	success: 'border-success text-success',
}

const HINT_TEXT: Record<InputStatus, string> = {
	error: 'text-error',
	warning: 'text-warning',
	success: 'text-success',
}

function hasHint(hint: ReactNode) {
	return hint != null && hint !== false && hint !== ''
}

export function Input({
	value,
	defaultValue,
	onChange,
	onPressEnter,
	size = 'md',
	variant = 'filled',
	status,
	allowClear = false,
	prefix,
	suffix,
	showCount = false,
	hint,
	hintStatus,
	hintReserve = false,
	className,
	disabled,
	readOnly,
	maxLength,
	placeholder,
	onKeyDown,
	...rest
}: InputProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const hintId = useId()
	const isControlled = value !== undefined
	const [internal, setInternal] = useState(defaultValue ?? '')
	const current = isControlled ? value : internal

	const [hintNode, setHintNode] = useState(hint)
	const [hintOpen, setHintOpen] = useState(() => hasHint(hint))

	useEffect(() => {
		if (hasHint(hint)) {
			setHintNode(hint)
			const frame = requestAnimationFrame(() => setHintOpen(true))
			return () => cancelAnimationFrame(frame)
		}
		setHintOpen(false)
		const timer = window.setTimeout(() => setHintNode(undefined), 160)
		return () => window.clearTimeout(timer)
	}, [hint])

	const commit = (next: string) => {
		const limited = maxLength != null ? next.slice(0, maxLength) : next
		if (!isControlled) setInternal(limited)
		onChange?.(limited)
	}

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		commit(e.target.value)
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		onKeyDown?.(e)
		if (e.defaultPrevented) return
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) onPressEnter?.(e.currentTarget.value)
	}

	const showClear = Boolean(allowClear && current.length > 0 && !disabled && !readOnly)
	const countText = maxLength != null ? `${current.length} / ${maxLength}` : String(current.length)
	const hintTone = hintStatus ?? status
	const describedBy = hasHint(hint) ? hintId : undefined

	return (
		<div className={classNames('relative w-full', className)}>
			<div
				className={classNames(
					'flex items-center rounded-md border transition-colors duration-100',
					FIELD_HEIGHT[size],
					variant === 'filled' ? 'bg-surface' : 'bg-transparent',
					status
						? STATUS_FIELD[status]
						: 'border-border-hover text-fg-2 focus-within:border-[color-mix(in_srgb,var(--border-hover),var(--fg)_14%)] focus-within:text-fg',
					variant === 'filled' && 'focus-within:bg-surface-hover',
					disabled && 'pointer-events-none opacity-50',
				)}
			>
				{prefix ? <span className="flex shrink-0 items-center pl-2.5 text-fg-3">{prefix}</span> : null}
				<input
					ref={inputRef}
					value={current}
					placeholder={placeholder}
					disabled={disabled}
					readOnly={readOnly}
					maxLength={maxLength}
					aria-invalid={status === 'error' || undefined}
					aria-describedby={describedBy}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					className={classNames(
						'min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-3',
						prefix ? 'pl-1.5' : 'pl-2.5',
						showClear || suffix || showCount ? 'pr-1.5' : 'pr-2.5',
					)}
					{...rest}
				/>
				{showClear ? (
					<button
						type="button"
						tabIndex={-1}
						aria-label="清空"
						onClick={() => {
							commit('')
							inputRef.current?.focus()
						}}
						className={classNames(
							'flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center text-[color-mix(in_srgb,var(--fg-3)_80%,var(--fg-disabled))] transition-colors duration-100 hover:text-fg-2',
							suffix || showCount ? 'mr-1' : 'mr-2',
						)}
					>
						<CloseCircleIcon />
					</button>
				) : null}
				{suffix ? (
					<span
						className={classNames(
							'flex shrink-0 items-center text-fg-3',
							showCount ? 'px-1.5' : 'pr-2.5 pl-1.5',
						)}
					>
						{suffix}
					</span>
				) : null}
				{showCount ? (
					<span className="pointer-events-none shrink-0 pr-2.5 text-sm text-fg-3 tabular-nums select-none">
						{countText}
					</span>
				) : null}
			</div>
			<div
				className={classNames(
					'text-sm',
					hintReserve ? 'mt-1 min-h-4' : 'pointer-events-none absolute top-full right-0 left-0 mt-1',
				)}
			>
				<div
					id={describedBy}
					className={classNames(
						'transition duration-150 ease-out',
						hintOpen ? 'translate-y-0 opacity-100' : 'translate-y-0.5 opacity-0',
						hintTone ? HINT_TEXT[hintTone] : 'text-fg-3',
					)}
				>
					{hintNode}
				</div>
			</div>
		</div>
	)
}
