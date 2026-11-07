import classNames from 'classnames'
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { Popover } from './Popover'

export type DashRailItem = {
	id: string
	/** Hover card body. `null` / `undefined` / `false` / `''` skips the card. */
	preview?: ReactNode
	/** Accessible name for the mark. Falls back to the 1-based index. */
	label?: string
}

export type DashRailProps = {
	items: DashRailItem[]
	/** Pass to control the active mark. Omit for internal state. */
	activeId?: string
	/** Initial active id when uncontrolled. Ignored when `activeId` is passed. */
	defaultActiveId?: string
	onSelect?: (id: string) => void
	/** Name for the rail. Default `'列表'`. */
	ariaLabel?: string
	className?: string
}

const PREVIEW_WIDTH = 280
const CARD_DELAY = 80
const LEAVE_DELAY = 160
/** Pointer influence radius, in px. Line centers are 12px apart. */
const RADIUS = 16
/** Extra scale at the pointer. 1 + this is the longest a line gets. */
const GROWTH = 1.7

export function DashRail({
	items,
	activeId,
	defaultActiveId,
	onSelect,
	ariaLabel = '列表',
	className,
}: DashRailProps) {
	const [internalId, setInternalId] = useState(defaultActiveId)
	const isControlled = activeId !== undefined
	const currentId = isControlled ? activeId : internalId
	const [pointerY, setPointerY] = useState<number | null>(null)
	const [cardId, setCardId] = useState<string | null>(null)
	const lineRefs = useRef(new Map<string, HTMLButtonElement>())
	const closeTimer = useRef<number | null>(null)
	const nearId = pointerY == null ? null : nearestId(items, lineRefs.current, pointerY)

	useEffect(() => {
		const timer = window.setTimeout(() => setCardId(nearId), nearId ? CARD_DELAY : 0)
		return () => window.clearTimeout(timer)
	}, [nearId])

	useEffect(
		() => () => {
			if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
		},
		[],
	)

	const cancelClose = () => {
		if (closeTimer.current == null) return
		window.clearTimeout(closeTimer.current)
		closeTimer.current = null
	}

	const aim = (clientY: number) => {
		cancelClose()
		setPointerY(clientY)
	}

	const scheduleClose = () => {
		cancelClose()
		closeTimer.current = window.setTimeout(() => setPointerY(null), LEAVE_DELAY)
	}

	const select = (id: string) => {
		if (!isControlled) setInternalId(id)
		onSelect?.(id)
	}

	return (
		<nav
			aria-label={ariaLabel}
			className={classNames('inline-flex w-10 cursor-pointer flex-col py-1', className)}
			onPointerMove={(event) => aim(event.clientY)}
			onPointerLeave={scheduleClose}
			onClick={(event) => {
				const id = nearestId(items, lineRefs.current, event.clientY)
				if (id) select(id)
			}}
			onKeyDown={(event) => {
				if (event.key === 'Escape') setPointerY(null)
			}}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node)) scheduleClose()
			}}
		>
			{items.map((item, index) => (
				<DashRailMark
					key={item.id}
					item={item}
					index={index}
					active={item.id === currentId}
					scale={lineScale(pointerY, lineRefs.current.get(item.id))}
					cardOpen={item.id === cardId && hasPreview(item.preview)}
					onAim={() => {
						const el = lineRefs.current.get(item.id)
						if (!el) return
						const rect = el.getBoundingClientRect()
						aim(rect.top + rect.height / 2)
					}}
					onCardEnter={cancelClose}
					onCardLeave={scheduleClose}
					lineRef={(node) => {
						if (node) lineRefs.current.set(item.id, node)
						else lineRefs.current.delete(item.id)
					}}
				/>
			))}
		</nav>
	)
}

function DashRailMark({
	item,
	index,
	active,
	scale,
	cardOpen,
	onAim,
	onCardEnter,
	onCardLeave,
	lineRef,
}: {
	item: DashRailItem
	index: number
	active: boolean
	scale: number
	cardOpen: boolean
	onAim: () => void
	onCardEnter: () => void
	onCardLeave: () => void
	lineRef: Ref<HTMLButtonElement>
}) {
	const line = (
		<button
			ref={lineRef}
			type="button"
			aria-label={item.label ?? String(index + 1)}
			aria-current={active ? 'true' : undefined}
			onFocus={onAim}
			className="flex h-3 w-full items-center justify-start border-0 bg-transparent p-0 outline-none"
		>
			<span
				aria-hidden
				className={classNames(
					'block h-0.5 w-2.5 origin-left rounded-full transition-[transform,background-color] duration-200 ease-out',
					active || scale > 2.1 ? 'bg-fg-bright' : 'bg-fg-disabled',
				)}
				style={{ transform: `scaleX(${scale})` }}
			/>
		</button>
	)

	if (!hasPreview(item.preview)) return line

	return (
		<Popover
			trigger={[]}
			open={cardOpen}
			placement="right"
			offset={10}
			width={PREVIEW_WIDTH}
			content={
				<div className="p-3" onPointerEnter={onCardEnter} onPointerLeave={onCardLeave}>
					{item.preview}
				</div>
			}
		>
			{line}
		</Popover>
	)
}

function hasPreview(preview: ReactNode) {
	return preview != null && preview !== false && preview !== ''
}

function nearestId(items: DashRailItem[], lines: Map<string, HTMLButtonElement>, clientY: number) {
	let best: { id: string; dist: number } | null = null
	for (const item of items) {
		const el = lines.get(item.id)
		if (!el) continue
		const rect = el.getBoundingClientRect()
		const dist = Math.abs(clientY - (rect.top + rect.height / 2))
		if (!best || dist < best.dist) best = { id: item.id, dist }
	}
	return best?.id ?? null
}

function lineScale(pointerY: number | null, el: HTMLButtonElement | undefined) {
	if (pointerY == null || !el) return 1
	const rect = el.getBoundingClientRect()
	const dist = Math.abs(pointerY - (rect.top + rect.height / 2))
	const influence = Math.max(0, 1 - dist / RADIUS)
	return 1 + influence * GROWTH
}
