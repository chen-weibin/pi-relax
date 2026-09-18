import { Command } from 'cmdk'
import classNames from 'classnames'
import {
	autoUpdate,
	flip,
	FloatingPortal,
	offset,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import type { Placement } from '@floating-ui/react'
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type UIEvent,
} from 'react'
import { SearchInput } from './SearchInput'
import { CheckIcon, ChevronRightIcon } from '../icons'
import '../styles/scrollbar.css'

export interface SelectOption<V = string> {
	value: V
	label: string
	disabled?: boolean
}

export interface SelectLoadOptionsParams {
	query: string
	offset: number
	limit: number
}

export interface SelectLoadOptionsResult<V> {
	items: SelectOption<V>[]
	hasMore: boolean
}

export type SelectDropdownWidth = 'trigger' | number

export interface SelectProps<V> {
	value?: V
	defaultValue?: V
	onChange?: (value: V) => void
	placeholder?: string
	disabled?: boolean
	className?: string

	/** Static mode: render this fixed list, no fetcher. */
	options?: SelectOption<V>[]

	/** Lazy / searchable mode: caller-owned data source. */
	loadOptions?: (
		p: SelectLoadOptionsParams,
	) => Promise<SelectLoadOptionsResult<V>>

	/** Page size for `loadOptions`. Default 20. */
	pageSize?: number

	/** Show search input above the list. Works with both `options` and `loadOptions`. */
	searchable?: boolean

	/** Debounce ms for query → loadOptions refetch. Default 200. */
	debounceMs?: number

	/**
	 * Preferred dropdown placement. `flip()` middleware auto-flips if it doesn't fit.
	 * Default `'bottom-start'`.
	 */
	placement?: Placement

	/**
	 * Dropdown width strategy:
	 * - `'trigger'` (default): width follows the trigger button.
	 * - `number`: fixed pixel width, independent of trigger.
	 */
	dropdownWidth?: SelectDropdownWidth
}

export function Select<V = string>({
	value,
	defaultValue,
	onChange,
	placeholder = '选择...',
	disabled,
	className,
	options,
	loadOptions,
	pageSize = 20,
	searchable = false,
	debounceMs = 200,
	placement = 'bottom-start',
	dropdownWidth = 'trigger',
}: SelectProps<V>) {
	const isControlled = value !== undefined
	const [internal, setInternal] = useState<V | undefined>(defaultValue)
	const current = isControlled ? value : internal

	const [open, setOpen] = useState(false)
	const [items, setItems] = useState<SelectOption<V>[]>(options ?? [])
	const [query, setQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const [offsetValue, setOffsetValue] = useState(0)
	const [hasMore, setHasMore] = useState(true)
	const [loading, setLoading] = useState(false)
	const [triggerWidth, setTriggerWidth] = useState(0)
	const [hoveredValue, setHoveredValue] = useState<V | null>(null)

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { context, floatingStyles, refs } = useFloating({
		open,
		onOpenChange: setOpen,
		placement,
		middleware: [offset(6), flip(), shift({ padding: 4 })],
		whileElementsMounted: autoUpdate,
	})

	const click = useClick(context)
	const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true })
	const roleProps = useRole(context, { role: 'listbox' })
	const { getReferenceProps, getFloatingProps } = useInteractions([
		click,
		dismiss,
		roleProps,
	])

	const setReference = useCallback(
		(node: HTMLButtonElement | null) => {
			refs.setReference(node)
			triggerRef.current = node
		},
		[refs],
	)
	const setFloating = useCallback(
		(node: HTMLElement | null) => {
			refs.setFloating(node)
		},
		[refs],
	)

	const isLazy = !!loadOptions

	const loadPage = useCallback(
		async (nextOffset: number, q: string, reset: boolean) => {
			if (!loadOptions) return
			setLoading(true)
			try {
				const res = await loadOptions({
					query: q,
					offset: nextOffset,
					limit: pageSize,
				})
				setItems((prev) => (reset ? res.items : [...prev, ...res.items]))
				setHasMore(res.hasMore)
				setOffsetValue(nextOffset + res.items.length)
			} finally {
				setLoading(false)
			}
		},
		[loadOptions, pageSize],
	)

	useEffect(() => {
		const t = setTimeout(() => setDebouncedQuery(query), debounceMs)
		return () => clearTimeout(t)
	}, [query, debounceMs])

	useLayoutEffect(() => {
		if (!open) return
		const w = triggerRef.current?.offsetWidth
		if (w) setTriggerWidth(w)
	}, [open])

	useEffect(() => {
		if (!open) return
		if (options) {
			setItems(options)
			return
		}
		setQuery('')
		setDebouncedQuery('')
		setOffsetValue(0)
		setHasMore(true)
		loadPage(0, '', true)
	}, [open, options, loadPage])

	useEffect(() => {
		if (!open || !isLazy) return
		loadPage(0, debouncedQuery, true)
	}, [debouncedQuery, open, isLazy, loadPage])

	const selectedOption = useMemo(
		() => items.find((it) => it.value === current),
		[items, current],
	)

	const displayItems = useMemo(() => {
		if (isLazy || !searchable) return items
		const q = query.trim().toLowerCase()
		if (!q) return items
		return items.filter((it) => it.label.toLowerCase().includes(q))
	}, [items, isLazy, searchable, query])

	const handleSelect = (item: SelectOption<V>) => {
		if (item.disabled) return
		if (!isControlled) setInternal(item.value)
		onChange?.(item.value)
		setHoveredValue(null)
		setOpen(false)
	}

	const handleScroll = (e: UIEvent<HTMLDivElement>) => {
		if (!isLazy || loading || !hasMore) return
		const el = e.currentTarget
		if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
			loadPage(offsetValue, debouncedQuery, false)
		}
	}

	const triggerLabel = selectedOption?.label ?? placeholder
	const isPlaceholder = !selectedOption

	const floatingWidth =
		dropdownWidth === 'trigger' ? triggerWidth || undefined : dropdownWidth

	const trigger = (
		<button
			ref={setReference}
			type="button"
			disabled={disabled}
			{...getReferenceProps({
				className: classNames(
					'inline-flex h-[30px] cursor-pointer items-center justify-between gap-2 rounded-md border border-border-hover bg-surface px-2.5 text-left text-md outline-none transition-colors duration-100',
					isPlaceholder ? 'text-fg-2' : 'text-fg',
					'hover:bg-surface-hover',
					'focus:border-[color-mix(in_srgb,var(--border-hover),var(--fg)_14%)] focus:bg-surface-hover',
					'data-[state=open]:border-[color-mix(in_srgb,var(--border-hover),var(--fg)_14%)] data-[state=open]:bg-surface-hover',
					'disabled:pointer-events-none disabled:opacity-50',
					className,
				),
			})}
		>
			<span className="truncate">{triggerLabel}</span>
			<span className="shrink-0 rotate-90 text-fg-3 [&_svg]:h-3 [&_svg]:w-3">
				<ChevronRightIcon />
			</span>
		</button>
	)

	const content = (
		<div
			ref={setFloating}
			style={{ ...floatingStyles, width: floatingWidth }}
			{...getFloatingProps({
				className: 'z-[99] flex flex-col rounded-lg border border-border-hover bg-sidebar p-1 text-sm text-fg-2 outline-none',
			})}
		>
			<Command
				shouldFilter={false}
				disablePointerSelection
				className="flex flex-col gap-1"
			>
				{searchable && (
					<SearchInput
						variant="ghost"
						showIcon={false}
						placeholder="搜索..."
						className="w-full"
						value={query}
						onChange={setQuery}
					/>
				)}
				{searchable && (
					<div className="-mx-1 border-t border-border-hover" />
				)}

				<div
					className="scrollbar-none overflow-y-auto"
					style={{ scrollbarGutter: 'auto', maxHeight: 192 }}
					onScroll={handleScroll}
				>
					<Command.List>
						{displayItems.length === 0 && (
							<div className="px-2.5 py-1.5 text-center text-xs text-fg-3">暂无结果</div>
						)}

						<div className="flex flex-col gap-0.5">
							{displayItems.map((item) => {
								const isSelected = item.value === current
								const isHovered = item.value === hoveredValue
								return (
									<Command.Item
										key={String(item.value)}
										value={String(item.value)}
										disabled={item.disabled}
										onSelect={() => handleSelect(item)}
										onPointerEnter={() => setHoveredValue(item.value)}
										onPointerLeave={() => setHoveredValue(null)}
										className={classNames(
											'flex h-[30px] cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 text-sm outline-none',
											isSelected && 'bg-surface-active text-fg-bright',
											!isSelected && isHovered && 'bg-surface-hover',
											'aria-[disabled=true]:pointer-events-none aria-[disabled=true]:opacity-50',
											isSelected ? 'text-fg-bright' : 'text-fg-2',
										)}
									>
										<span className="truncate">{item.label}</span>
										{isSelected && (
											<span className="shrink-0 text-fg-bright">
												<CheckIcon />
											</span>
										)}
									</Command.Item>
								)
							})}
						</div>

						{loading && (
							<div className="px-2.5 py-1.5 text-center text-xs text-fg-3">
								加载中...
							</div>
						)}
						{!loading && !hasMore && items.length > 0 && (
							<div className="px-2.5 py-1.5 text-center text-xs text-fg-3">
								没有更多了
							</div>
						)}
					</Command.List>
				</div>
			</Command>
		</div>
	)

	return (
		<>
			{trigger}
			{open && <FloatingPortal>{content}</FloatingPortal>}
		</>
	)
}