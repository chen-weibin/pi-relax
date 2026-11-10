import classNames from 'classnames'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { CloseIcon } from '../icons'
import { Button } from './Button'
import { IconButton } from './IconButton'

/** 关闭原因 */
export type SwipeToastCloseReason = 'timeout' | 'swipe' | 'action' | 'close' | 'escape' | 'programmatic'
/** 引信位置。`none` = 不画引信(倒计时照跑) */
export type SwipeToastFuse = 'bottom' | 'top' | 'none'
/** `inline` = 待在文档流里;`bottom-right` = 固定在右下角 */
export type SwipeToastPlacement = 'inline' | 'bottom-right'

export type SwipeToastProps = {
	/** 主标题 */
	title?: ReactNode
	/** 副描述 */
	description?: ReactNode
	/** 左侧图标 */
	icon?: ReactNode
	/** 动作按钮文案。不传就不渲染按钮 */
	actionLabel?: ReactNode
	/** 动作按钮回调。点完自动关闭 */
	onAction?: () => void
	/** 受控开关。置 false 收起并回调 `onClose('programmatic')` */
	open?: boolean
	/** 关闭回调,带关闭原因 */
	onClose?: (reason: SwipeToastCloseReason) => void
	/** 自动消失时间(ms)。0 = 不自动消失 */
	duration?: number
	/** 引信位置 */
	fuse?: SwipeToastFuse
	/** 引信颜色。默认走 `--warning` */
	fuseColor?: string
	/** 下滑多少 px 判定为关闭 */
	swipeDistance?: number
	/** 悬停 / 聚焦时暂停引信 */
	pauseOnHover?: boolean
	/** 显示关闭按钮 */
	closeButton?: boolean
	/** 能否下滑关闭 */
	dismissible?: boolean
	/** 内联还是右下角浮层 */
	placement?: SwipeToastPlacement
	/** 宽度(px) */
	width?: number
	/** 圆角(px) */
	radius?: number
	className?: string
}

type Phase = 'open' | 'closing' | 'gone'
type Sample = [number, number]
type Drag = { id: number; startY: number; grab: number | null; moved: boolean; hist: Sample[] }

const EASE_OUT = [0.23, 1, 0.32, 1] as const
/** 甩动阈值(px/ms) */
const FLICK = 0.11
/** 死区:位移小于它不算拖拽 */
const DEAD_ZONE = 3
/** 往上拖的阻尼距离 */
const RESIST_PX = 24
/** 入场 / 退场时长(ms)。入场要跟外层 grid 槽位展开的时长一致,否则卡片和槽位会错开 */
const ENTER_MS = 200
const EXIT_MS = 220

/** 越界阻尼:往回拉时位移衰减 */
const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

/** 取最近一段采样算速度(px/ms),超过 100ms 没动就按 0 算 */
function velocityOf(hist: Sample[]) {
	const first = hist[0]
	const last = hist[hist.length - 1]
	if (!first || !last) return 0
	const [t0, y0] = first
	const [t1, y1] = last
	return performance.now() - t1 > 100 ? 0 : (y1 - y0) / Math.max(1, t1 - t0)
}

const FUSE_GRADIENT = `linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--st-fuse) 18%, transparent) 9%, color-mix(in srgb, var(--st-fuse) 50%, transparent) 18%, color-mix(in srgb, var(--st-fuse) 84%, transparent) 28%, var(--st-fuse) 38%, var(--st-fuse) 62%, color-mix(in srgb, var(--st-fuse) 84%, transparent) 72%, color-mix(in srgb, var(--st-fuse) 50%, transparent) 82%, color-mix(in srgb, var(--st-fuse) 18%, transparent) 91%, transparent 100%)`

export function SwipeToast({
	title = '已归档',
	description,
	icon,
	actionLabel,
	onAction,
	open = true,
	onClose,
	duration = 4000,
	fuse = 'bottom',
	fuseColor = 'var(--warning)',
	swipeDistance = 40,
	pauseOnHover = true,
	closeButton = false,
	dismissible = true,
	placement = 'inline',
	width = 356,
	radius = 12,
	className,
}: SwipeToastProps) {
	const reduce = useReducedMotion()
	// 挂载时就是关着的:直接落到 gone,不播退场也不回调 onClose
	const [phase, setPhase] = useState<Phase>(() => (open ? 'open' : 'gone'))
	const cardRef = useRef<HTMLDivElement>(null)
	const fuseRef = useRef<HTMLElement>(null)
	const burnRef = useRef<Animation | null>(null)
	const dragRef = useRef<Drag | null>(null)
	/** 引信暂停的四个来源 */
	const flagsRef = useRef({ hover: false, interacting: false, focus: false, hidden: false })
	const leavingRef = useRef(false)
	const pendingCloseRef = useRef<SwipeToastCloseReason | null>(null)
	const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
	const phaseRef = useRef<Phase>(phase)
	phaseRef.current = phase
	const onCloseRef = useRef(onClose)
	onCloseRef.current = onClose
	const onActionRef = useRef(onAction)
	onActionRef.current = onAction

	const y = useMotionValue(24)
	const fade = useMotionValue(0)
	const transform = useTransform(y, (v) => `translateY(${v}px)`)

	/** 引信只在没有暂停来源时继续烧 */
	const syncBurn = () => {
		const anim = burnRef.current
		if (!anim) return
		const flags = flagsRef.current
		if (flags.hover || flags.interacting || flags.focus || flags.hidden) anim.pause()
		else if (anim.playState === 'paused') anim.play()
	}

	const finish = (reason: SwipeToastCloseReason) => {
		setPhase('gone')
		leavingRef.current = false
		onCloseRef.current?.(reason)
	}

	const close = (reason: SwipeToastCloseReason) => {
		if (phaseRef.current !== 'open' || leavingRef.current) return
		// 正在拖拽就先记下,松手再关
		if (dragRef.current) {
			pendingCloseRef.current = reason
			return
		}
		burnRef.current?.pause()
		leavingRef.current = true
		setPhase('closing')
		clearTimeout(closeTimerRef.current)
		const height = cardRef.current?.offsetHeight ?? 0
		if (!reduce) animate(y, y.get() + height, { duration: EXIT_MS / 1000, ease: EASE_OUT })
		animate(fade, 0, { duration: EXIT_MS / 1000, ease: 'easeOut' })
		closeTimerRef.current = setTimeout(() => finish(reason), EXIT_MS)
	}

	/** 收回:重新打开时把位移和透明度复位 */
	const rescue = () => {
		clearTimeout(closeTimerRef.current)
		leavingRef.current = false
		setPhase('open')
	}

	// 入场:phase 变成 open 时播一次
	useEffect(() => {
		if (phase !== 'open') return
		if (reduce) {
			y.set(0)
			fade.set(1)
			return
		}
		// 从卡片自身高度滑入,跟外层槽位 0fr→1fr 的展开同步 ——
		// 槽位是慢慢长出来的,叠在上面的 toast 会被「顶」着平滑上移,不会瞬移
		y.set(cardRef.current?.offsetHeight ?? 0)
		const enter = animate(y, 0, { duration: ENTER_MS / 1000, ease: EASE_OUT })
		animate(fade, 1, { duration: ENTER_MS / 1000, ease: 'easeOut' })
		return () => enter.stop()
	}, [phase])

	// 引信 = 倒计时。烧完就关
	useEffect(() => {
		if (phase !== 'open' || duration <= 0 || !fuseRef.current) return
		const anim = fuseRef.current.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
			duration,
			easing: 'linear',
			fill: 'forwards',
		})
		anim.onfinish = () => close('timeout')
		burnRef.current = anim
		syncBurn()
		return () => {
			anim.onfinish = null
			anim.pause()
		}
	}, [phase, duration])

	// 受控开关
	useEffect(() => {
		if (!open) close('programmatic')
		else if (phaseRef.current !== 'open') rescue()
	}, [open])

	// 关掉 pauseOnHover 时把悬停标记清掉
	useEffect(() => {
		if (!pauseOnHover) {
			flagsRef.current.hover = false
			syncBurn()
		}
	}, [pauseOnHover])

	// 标签页切走时停表
	useEffect(() => {
		const onVisibility = () => {
			flagsRef.current.hidden = document.hidden
			syncBurn()
		}
		document.addEventListener('visibilitychange', onVisibility)
		return () => {
			document.removeEventListener('visibilitychange', onVisibility)
			clearTimeout(closeTimerRef.current)
			burnRef.current?.cancel()
		}
	}, [])

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0 || !dismissible || dragRef.current || leavingRef.current) return
		// 点按钮不当作拖拽
		if ((e.target as HTMLElement).closest('button')) return
		if (phaseRef.current === 'closing') rescue()
		try {
			cardRef.current?.setPointerCapture(e.pointerId)
		} catch {
			// 指针已经抬起来了,忽略
		}
		y.stop()
		dragRef.current = {
			id: e.pointerId,
			startY: e.clientY,
			grab: null,
			moved: false,
			hist: [[performance.now(), y.get()]],
		}
		flagsRef.current.interacting = true
		syncBurn()
	}

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		if (!drag || drag.id !== e.pointerId) return
		if (drag.grab === null) {
			if (Math.abs(e.clientY - drag.startY) < DEAD_ZONE) return
			drag.grab = e.clientY - y.get()
			cardRef.current?.setAttribute('data-swiping', '')
		}
		const raw = e.clientY - drag.grab
		y.set(raw >= 0 ? raw : rubberband(raw, RESIST_PX))
		drag.moved = true
		drag.hist.push([performance.now(), y.get()])
		if (drag.hist.length > 4) drag.hist.shift()
	}

	const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current
		if (!drag || drag.id !== e.pointerId) return
		dragRef.current = null
		cardRef.current?.removeAttribute('data-swiping')
		try {
			cardRef.current?.releasePointerCapture(e.pointerId)
		} catch {
			// 已经释放
		}
		flagsRef.current.interacting = false
		const dy = y.get()
		const v = velocityOf(drag.hist)
		// 甩一下或者拖够距离就算关
		if (dy > 0 && (v > FLICK || (dy >= swipeDistance && v >= 0))) {
			burnRef.current?.pause()
			leavingRef.current = true
			pendingCloseRef.current = null
			const height = cardRef.current?.offsetHeight ?? 0
			if (!reduce) {
				animate(y, dy + height, { type: 'spring', duration: 0.3, bounce: 0, velocity: v * 1000 })
			}
			animate(fade, 0, { duration: EXIT_MS / 1000, ease: 'easeOut' })
			closeTimerRef.current = setTimeout(() => finish('swipe'), EXIT_MS)
			return
		}
		if (drag.moved) {
			animate(y, 0, reduce ? { duration: 0.2 } : { type: 'spring', duration: 0.5, bounce: 0.2, velocity: v * 1000 })
		}
		const queued = pendingCloseRef.current
		pendingCloseRef.current = null
		if (queued) close(queued)
		else syncBurn()
	}

	return (
		<div
			data-phase={phase}
			className={classNames(
				// grid-cols-[minmax(0,1fr)]:列宽锁死成容器宽,不然 nowrap 的标题会把列撑开、卡片溢出
				'grid grid-cols-[minmax(0,1fr)] w-[var(--st-w)] max-w-full text-md leading-normal text-fg',
				placement === 'inline'
					? // 内联:关掉时把这一行的高度收掉,不留空位;
						// starting: 让新 toast 的槽位从 0fr 展开,叠着的旧 toast 才不会被瞬移顶上去
						'[grid-template-rows:1fr] starting:[grid-template-rows:0fr] transition-[grid-template-rows] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none data-[phase=closing]:[grid-template-rows:0fr] data-[phase=gone]:[grid-template-rows:0fr]'
					: 'fixed right-6 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-50 w-[min(var(--st-w),calc(100vw-48px))]',
				className,
			)}
			style={
				{
					'--st-w': `${width}px`,
					'--st-radius': `${radius}px`,
					'--st-fuse': fuseColor,
				} as CSSProperties
			}
		>
			<div className="min-h-0">
				<motion.div
					ref={cardRef}
					role="status"
					aria-live="polite"
					aria-atomic="true"
					tabIndex={0}
					style={{ transform, opacity: fade }}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
					onPointerEnter={(e) => {
						if (pauseOnHover && e.pointerType === 'mouse') {
							flagsRef.current.hover = true
							syncBurn()
						}
					}}
					onPointerLeave={(e) => {
						if (e.pointerType === 'mouse') {
							flagsRef.current.hover = false
							syncBurn()
						}
					}}
					onFocus={() => {
						flagsRef.current.focus = true
						syncBurn()
					}}
					onBlur={(e) => {
						if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
							flagsRef.current.focus = false
							syncBurn()
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape' && dismissible) {
							e.stopPropagation()
							close('escape')
						}
					}}
					className={classNames(
						'relative flex items-start gap-2.5 overflow-hidden border border-border-hover bg-surface p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_rgba(0,0,0,0.32)] outline-none select-none touch-none',
						'rounded-[length:var(--st-radius)]',
						'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app',
						dismissible ? 'cursor-grab data-[swiping]:cursor-grabbing' : 'cursor-default',
					)}
				>
					{icon ? (
						<span aria-hidden className="inline-flex size-4 shrink-0 items-center justify-center text-fg-2 [&_svg]:size-4">
							{icon}
						</span>
					) : null}
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="truncate text-base font-medium text-fg">{title}</span>
						{description ? <span className="line-clamp-2 text-sm text-fg-3">{description}</span> : null}
					</span>
					{actionLabel ? (
						<Button
							tone="inverse"
							size="sm"
							onClick={() => {
								onActionRef.current?.()
								close('action')
							}}
						>
							{actionLabel}
						</Button>
					) : null}
					{closeButton ? (
						<IconButton size="sm" title="关闭" onClick={() => close('close')}>
							<CloseIcon />
						</IconButton>
					) : null}
					{/* 引信:烧完 = 倒计时结束 */}
					<i
						ref={fuseRef}
						aria-hidden
						style={{ background: FUSE_GRADIENT }}
						className={classNames(
							'pointer-events-none absolute right-0 left-0 h-0.5 origin-left',
							fuse === 'top' ? 'top-0' : 'bottom-0',
							// 没有倒计时就不画引信
							(duration <= 0 || fuse === 'none') && 'opacity-0',
						)}
					/>
				</motion.div>
			</div>
		</div>
	)
}
