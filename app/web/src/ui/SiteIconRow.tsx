import classNames from 'classnames'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { circlesThatFit, limitSiteIcons } from './siteIconSlots'
import { Popover } from './Popover'
import { SiteMark, type SiteMarkSize } from './SiteMark'
import { Tooltip } from './Tooltip'

const ENTER_DELAY = 150
const LEAVE_DELAY = 120

export type SiteIcon = {
	name: string
	/** 关联地址。组件不根据它去取图标。 */
	url: string
	/** 图片地址。由调用方传入；`null` 直接走首字圆。 */
	src: string | null
	/** 为 true，或传入 `onClick` 时，这一颗可点。 */
	clickable?: boolean
	onClick?: () => void
	/** 可选。有内容才挂 Tooltip。 */
	tooltip?: ReactNode
}

export type SiteIconRowProps = {
	sites: SiteIcon[]
	className?: string
	style?: CSSProperties
	/** 传给每一颗 [`SiteMark`](./SiteMark.tsx)，数字圆同一尺寸。 */
	size?: SiteMarkSize | number
	/**
	 * 这一排最多几个圆，含末尾数字。
	 * 超出时前面留 `max - 1` 个图标，最后一个圆是 `+N`。不传则全部展示。
	 */
	max?: number
	/**
	 * 为 true 时不重叠，宽度跟父级走，一行放不下才换到下一行，悬停不散开。
	 * 默认单行重叠。
	 */
	wrap?: boolean
	/** 为 true 时，悬停 `+N` 在浮窗里铺开剩余图标。默认不展开。 */
	overflowHover?: boolean
}

function pxOf(size: SiteMarkSize | number): number {
	if (typeof size === 'number') return size
	if (size === 'sm') return 16
	if (size === 'lg') return 24
	return 20
}

function useSpreadHover() {
	const [spread, setSpread] = useState(false)
	const timer = useRef(0)
	useEffect(() => () => window.clearTimeout(timer.current), [])
	const schedule = (next: boolean, delay: number) => {
		window.clearTimeout(timer.current)
		timer.current = window.setTimeout(() => setSpread(next), delay)
	}
	return {
		spread,
		hover: {
			onPointerEnter: (event: PointerEvent) => {
				if (event.pointerType !== 'mouse') return
				schedule(true, ENTER_DELAY)
			},
			onPointerLeave: () => schedule(false, LEAVE_DELAY),
		},
	}
}

function hasTooltip(tooltip: ReactNode): boolean {
	return tooltip != null && tooltip !== false && tooltip !== ''
}

function availableWidth(node: HTMLElement): number {
	const parent = node.parentElement
	if (!parent) return node.clientWidth
	const parentStyle = getComputedStyle(parent)
	const row = parentStyle.flexDirection.startsWith('row')
	const flex = parentStyle.display === 'flex' || parentStyle.display === 'inline-flex'
	if (!flex || !row) return parent.clientWidth
	const gap = Number.parseFloat(parentStyle.columnGap) || 0
	let siblings = 0
	let siblingCount = 0
	for (const child of parent.children) {
		if (child === node) continue
		const childStyle = getComputedStyle(child)
		if (childStyle.display === 'none' || childStyle.position === 'absolute') continue
		siblings += (child as HTMLElement).offsetWidth
		siblings += (Number.parseFloat(childStyle.marginLeft) || 0) + (Number.parseFloat(childStyle.marginRight) || 0)
		siblingCount += 1
	}
	const nodeStyle = getComputedStyle(node)
	const margins = (Number.parseFloat(nodeStyle.marginLeft) || 0) + (Number.parseFloat(nodeStyle.marginRight) || 0)
	return Math.max(0, parent.clientWidth - siblings - siblingCount * gap - margins)
}

/** 单行时按父级剩余宽度决定最多几个圆。多行不裁。 */
function useCircleBudget(enabled: boolean, px: number, overlap: number) {
	const ref = useRef<HTMLSpanElement>(null)
	const [budget, setBudget] = useState<number | undefined>(undefined)
	useLayoutEffect(() => {
		if (!enabled) {
			setBudget(undefined)
			return
		}
		const node = ref.current
		const parent = node?.parentElement
		if (!node || !parent) return
		const apply = () => {
			const next = Math.max(1, circlesThatFit(availableWidth(node), px, overlap))
			setBudget((prev) => (prev === next ? prev : next))
		}
		apply()
		const observer = new ResizeObserver(apply)
		observer.observe(parent)
		return () => observer.disconnect()
	}, [enabled, px, overlap])
	return { ref, budget }
}

/**
 * 一排网站图标。单行时重叠，靠后的盖在上面；悬停后散开，不展示名称。
 * 超出 `max` 的个数收进最后一个数字圆。
 */
export function SiteIconRow({
	sites,
	className,
	style,
	size = 'md',
	max,
	wrap = false,
	overflowHover = false,
}: SiteIconRowProps) {
	const reduced = useReducedMotion()
	const { spread, hover } = useSpreadHover()
	const px = pxOf(size)
	const overlap = Math.round(px * 0.4)
	const { ref, budget } = useCircleBudget(!wrap, px, overlap)
	const { shown, overflow } = limitSiteIcons(sites, max, wrap ? undefined : budget)
	if (shown.length === 0 && overflow === 0) return null

	const count = shown.length + (overflow > 0 ? 1 : 0)
	const fan = !wrap && count > 1 && spread
	const shift = fan ? overlap : 0
	const transition = reduced ? { duration: 0 } : { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const }
	const rest = overflow > 0 ? sites.slice(shown.length) : []

	return (
		<motion.span
			ref={ref}
			{...hover}
			className={classNames(
				'items-center',
				wrap ? 'flex w-full min-w-0 flex-wrap gap-1.5' : 'inline-flex max-w-full min-w-0 flex-nowrap',
				className,
			)}
			style={style}
			initial={false}
			animate={{ paddingRight: shift * Math.max(0, count - 1) }}
			transition={transition}
		>
			{shown.map((site, index) => (
				<IconFace
					key={`${site.url}-${index}`}
					site={site}
					size={size}
					index={index}
					overlap={wrap ? 0 : overlap}
					shift={shift}
					transition={transition}
				/>
			))}
			{overflow > 0 ? (
				<CountFace
					index={shown.length}
					overlap={wrap ? 0 : overlap}
					shift={shift}
					px={px}
					size={size}
					overflow={overflow}
					rest={rest}
					overflowHover={overflowHover}
					transition={transition}
				/>
			) : null}
		</motion.span>
	)
}

function IconFace({
	site,
	size,
	index,
	overlap,
	shift,
	transition,
}: {
	site: SiteIcon
	size: SiteMarkSize | number
	index: number
	overlap: number
	shift: number
	transition: { duration: number; ease?: readonly [number, number, number, number] }
}) {
	const interactive = site.clickable || site.onClick != null
	const face = (
		<motion.span
			className="relative inline-flex shrink-0 rounded-full"
			style={{
				zIndex: index + 1,
				marginLeft: index === 0 ? 0 : -overlap,
				boxShadow: '0 0 0 2px var(--app)',
			}}
			initial={false}
			animate={{ x: shift * index }}
			transition={transition}
		>
			<SiteMark
				name={site.name}
				src={site.src}
				size={size}
				clickable={interactive}
				aria-label={site.name || undefined}
				onClick={
					interactive
						? (event) => {
								event.stopPropagation()
								site.onClick?.()
							}
						: undefined
				}
			/>
		</motion.span>
	)
	if (!hasTooltip(site.tooltip)) return face
	return (
		<Tooltip title={site.tooltip} placement="top">
			{face}
		</Tooltip>
	)
}

function CountFace({
	index,
	overlap,
	shift,
	px,
	size,
	overflow,
	rest,
	overflowHover,
	transition,
}: {
	index: number
	overlap: number
	shift: number
	px: number
	size: SiteMarkSize | number
	overflow: number
	rest: SiteIcon[]
	overflowHover: boolean
	transition: { duration: number; ease?: readonly [number, number, number, number] }
}) {
	const label = overflow > 99 ? '99+' : `+${overflow}`
	const badge = (
		<motion.span
			className="relative inline-flex shrink-0 items-center justify-center rounded-full font-medium text-fg-2 tabular-nums"
			style={{
				zIndex: index + 1,
				marginLeft: index === 0 ? 0 : -overlap,
				width: px,
				height: px,
				backgroundColor: 'color-mix(in srgb, var(--fg-3) 16%, var(--surface))',
				boxShadow: '0 0 0 2px var(--app)',
				fontSize: Math.max(9, Math.round(px * (label.length > 2 ? 0.34 : 0.42))),
			}}
			initial={false}
			animate={{ x: shift * index }}
			transition={transition}
		>
			{label}
		</motion.span>
	)
	if (!overflowHover || rest.length === 0) return badge
	return (
		<Popover
			trigger={['hover']}
			interactive
			placement="top"
			openDelay={120}
			className="p-2"
			content={
				<div className="flex max-w-64 flex-wrap gap-2">
					{rest.map((site, restIndex) => (
						<PlainFace key={`${site.url}-${restIndex}`} site={site} size={size} />
					))}
				</div>
			}
		>
			{badge}
		</Popover>
	)
}

function PlainFace({ site, size }: { site: SiteIcon; size: SiteMarkSize | number }) {
	const interactive = site.clickable || site.onClick != null
	const mark = (
		<SiteMark
			name={site.name}
			src={site.src}
			size={size}
			clickable={interactive}
			aria-label={site.name || undefined}
			onClick={
				interactive
					? (event) => {
							event.stopPropagation()
							site.onClick?.()
						}
					: undefined
			}
		/>
	)
	if (!hasTooltip(site.tooltip)) return mark
	return (
		<Tooltip title={site.tooltip} placement="top">
			{mark}
		</Tooltip>
	)
}
