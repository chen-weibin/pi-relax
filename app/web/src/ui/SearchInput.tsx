import classNames from 'classnames'
import {
	useRef,
	type InputHTMLAttributes,
	type KeyboardEvent,
	type ChangeEvent,
} from 'react'
import { SearchIcon } from '../icons'

export type SearchInputIconPosition = 'start' | 'end'

export type SearchInputProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'onChange' | 'value' | 'defaultValue'
> & {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
	onSearch?: (value: string) => void
	iconPosition?: SearchInputIconPosition
	placeholder?: string
	className?: string
}

export function SearchInput({
	value,
	defaultValue,
	onChange,
	onSearch,
	iconPosition = 'start',
	placeholder,
	className,
	disabled,
	onKeyDown,
	...rest
}: SearchInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const triggerSearch = () => {
		if (disabled) return
		onSearch?.(inputRef.current?.value ?? '')
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		onKeyDown?.(e)
		if (e.defaultPrevented) return
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
			e.preventDefault()
			triggerSearch()
		}
	}

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		onChange?.(e.target.value)
	}

	const isStart = iconPosition === 'start'

	const iconButton = (
		<button
			type="button"
			tabIndex={-1}
			aria-label="搜索"
			onClick={triggerSearch}
			disabled={disabled}
			className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-fg-3 transition-colors duration-100 hover:text-fg-bright focus:outline-none disabled:pointer-events-none disabled:opacity-50"
		>
			<SearchIcon />
		</button>
	)

	return (
		<div className={classNames('relative w-full', className)}>
			{isStart && (
				<span className="absolute left-2.5 top-1/2 -translate-y-1/2">
					{iconButton}
				</span>
			)}
			<input
				ref={inputRef}
				type="text"
				value={value}
				defaultValue={defaultValue}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				disabled={disabled}
				className={classNames(
					'h-[30px] w-full rounded-md border border-border-hover bg-surface text-md text-fg-2 outline-none transition-colors duration-100 placeholder:text-fg-3',
					'focus:border-[color-mix(in_srgb,var(--border-hover),var(--fg)_14%)] focus:bg-surface-hover focus:text-fg',
					'disabled:pointer-events-none disabled:opacity-50',
					isStart ? 'pl-9 pr-2.5' : 'pl-2.5 pr-9',
				)}
				{...rest}
			/>
			{!isStart && (
				<span className="absolute right-2.5 top-1/2 -translate-y-1/2">
					{iconButton}
				</span>
			)}
		</div>
	)
}
