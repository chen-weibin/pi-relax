import classNames from 'classnames'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Toaster as Sonner, toast as sonner, type ToasterProps } from 'sonner'
import { ErrorCircleIcon, InfoCircleIcon, SuccessCircleIcon, WarningCircleIcon } from '../icons'
import { getSquirclePath } from './AppIcon/squirclePath'

/** 卡片圆角(squircle),接近项目 --radius-xl */
const CARD_RADIUS = 12
const CARD_SMOOTHING = 0.6
/** 默认自动消失时间(毫秒) */
export const MESSAGE_DURATION = 2000

export type MessageType = 'success' | 'error' | 'warning' | 'info' | 'normal'

export type MessageProps = {
	/** 决定图标块颜色和默认图标 */
	type: MessageType
	/** 一行文本 */
	children: ReactNode
	/** 覆盖该类型的默认图标 */
	icon?: ReactNode
	className?: string
}

// 图标本身不带颜色(currentColor 镂空圆标),颜色在这里由外部控制
const TONES: Record<MessageType, { color: string; icon: ReactNode }> = {
	success: { color: '#34C759', icon: <SuccessCircleIcon /> },
	error: { color: '#FF3B30', icon: <ErrorCircleIcon /> },
	warning: { color: '#FF9500', icon: <WarningCircleIcon /> },
	info: { color: '#007AFF', icon: <InfoCircleIcon /> },
	normal: { color: '#8E8E93', icon: <InfoCircleIcon /> },
}

/** 一条消息的卡片。左侧彩色图标块 + 右侧一行文本,无标题 / 描述 / 关闭按钮。 */
export function Message({ type, children, icon, className }: MessageProps) {
	const tone = TONES[type]
	const bodyRef = useRef<HTMLDivElement>(null)
	const [size, setSize] = useState({ width: 0, height: 0 })

	useLayoutEffect(() => {
		const node = bodyRef.current
		if (!node) return
		const measure = () => setSize({ width: node.offsetWidth, height: node.offsetHeight })
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(node)
		return () => observer.disconnect()
	}, [])

	// squircle 轮廓跟着实际尺寸走:裁切卡片 + 描 1px 内边线
	const outline = size.width > 0 ? getSquirclePath(size.width, size.height, CARD_RADIUS, CARD_SMOOTHING) : null

	return (
		<div
			className={classNames(
				// 宽度固定:收起堆叠时所有卡片同宽,后面几条只露一条边
				'w-[320px] max-w-[calc(100vw-32px)]',
				// 阴影走 drop-shadow:clip-path 会切掉 box-shadow
				'[filter:drop-shadow(0_6px_16px_rgba(0,0,0,0.45))]',
				className,
			)}
		>
			<div
				ref={bodyRef}
				style={{ borderRadius: CARD_RADIUS, clipPath: outline ? `path('${outline}')` : undefined }}
				className="relative flex items-center bg-surface py-2 pr-3 pl-2.5"
			>
				{/* 收起堆叠时只隐藏内容行:卡片底色留着,后面几张还能叠出边 */}
				<div className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity duration-300 group-data-[expanded=false]/toast:group-data-[front=false]/toast:opacity-0 motion-reduce:transition-none">
					<span
						className="inline-flex size-6 shrink-0 items-center justify-center [&_svg]:size-6"
						style={{ color: tone.color }}
					>
						{icon ?? tone.icon}
					</span>
					<span className="min-w-0 flex-1 truncate text-md text-fg">{children}</span>
				</div>
				{outline && (
					<svg
						aria-hidden
						width={size.width}
						height={size.height}
						className="pointer-events-none absolute inset-0"
					>
						{/* 描边一半被裁掉,留下 1px 内边线 */}
						<path d={outline} fill="none" strokeWidth={2} className="stroke-white/10" />
					</svg>
				)}
			</div>
		</div>
	)
}

export type MessageOptions = {
	/** 决定图标块颜色和默认图标,默认 `info` */
	type?: MessageType
	/** 自动消失时间(毫秒)。默认走 `MessageToaster` 的全局时长(2000) */
	duration?: number
	/** 覆盖该类型的默认图标 */
	icon?: ReactNode
}

/** 弹一条消息,返回消息 id */
export function showMessage(text: ReactNode, options: MessageOptions = {}) {
	const { type = 'info', duration, icon } = options
	return sonner.custom(
		() => (
			<Message type={type} icon={icon}>
				{text}
			</Message>
		),
		// 不传 duration 就走 MessageToaster 上的全局时长
		duration === undefined ? {} : { duration },
	)
}

/** 全局调用入口。React 组件里用 `hooks/useMessage` 的 `show`。 */
export const message = Object.assign(
	(text: ReactNode, options?: MessageOptions) => showMessage(text, options),
	{
		success: (text: ReactNode, options?: Omit<MessageOptions, 'type'>) =>
			showMessage(text, { ...options, type: 'success' }),
		error: (text: ReactNode, options?: Omit<MessageOptions, 'type'>) =>
			showMessage(text, { ...options, type: 'error' }),
		warning: (text: ReactNode, options?: Omit<MessageOptions, 'type'>) =>
			showMessage(text, { ...options, type: 'warning' }),
		info: (text: ReactNode, options?: Omit<MessageOptions, 'type'>) =>
			showMessage(text, { ...options, type: 'info' }),
		normal: (text: ReactNode, options?: Omit<MessageOptions, 'type'>) =>
			showMessage(text, { ...options, type: 'normal' }),
		dismiss: (id?: string | number) => sonner.dismiss(id),
	},
)

export type MessageToasterProps = Omit<
	ToasterProps,
	'theme' | 'richColors' | 'invert' | 'closeButton' | 'icons' | 'position'
>

// 同时挂两个 Toaster 会让同一条消息出现两遍,只认第一个
let toasterActive = false

/** 消息容器。全局挂一次,位置固定在顶部居中。 */
export function MessageToaster({ gap = 10, duration = MESSAGE_DURATION, toastOptions, ...props }: MessageToasterProps) {
	const [active, setActive] = useState(false)

	useEffect(() => {
		if (toasterActive) return
		toasterActive = true
		setActive(true)
		return () => {
			toasterActive = false
		}
	}, [])

	if (!active) return null

	// 挂到 body:祖先的 z-index / transform 会裁掉这摞消息
	return createPortal(
		<Sonner
			position="top-center"
			gap={gap}
			duration={duration}
			{...props}
			toastOptions={{
				...toastOptions,
				classNames: {
					...toastOptions?.classNames,
					toast: classNames('group/toast flex w-full justify-center', toastOptions?.classNames?.toast),
				},
			}}
		/>,
		document.body,
	)
}
