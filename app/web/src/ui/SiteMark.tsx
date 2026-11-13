import classNames from 'classnames'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from 'react'

const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'] as const
const DEFAULT_COLOR = COLORS[0]

export type SiteMarkSize = 'sm' | 'md' | 'lg'

const SIZE_PX: Record<SiteMarkSize, number> = {
	sm: 16,
	md: 20,
	lg: 24,
}

export type SiteMarkProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
	/** 图片地址。空则直接走失败态。 */
	src?: string | null
	/** 失败态首字。不传则显示 `?`。 */
	name?: string
	/** `sm` 16 / `md` 20 / `lg` 24，或自定义像素。 */
	size?: SiteMarkSize | number
	/** 失败态圆底。不传则按 `name` 取默认色。 */
	color?: string
	/** 为 true，或传入 `onClick` 时，根节点渲染成 `button`。 */
	clickable?: boolean
}

function letterOf(name: string | undefined): string {
	const char = [...(name ?? '').trim()][0]
	return char ? char.toUpperCase() : '?'
}

function colorOf(name: string | undefined): string {
	if (!name) return DEFAULT_COLOR
	let hash = 0
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
	return COLORS[hash % COLORS.length] ?? DEFAULT_COLOR
}

function pxOf(size: SiteMarkSize | number): number {
	return typeof size === 'number' ? size : SIZE_PX[size]
}

/** 圆标。负责加载 `src`，失败时换成首字圆。 */
export function SiteMark({
	src,
	name,
	size = 'md',
	color,
	clickable = false,
	className,
	style,
	onClick,
	type = 'button',
	disabled,
	...rest
}: SiteMarkProps) {
	const [broken, setBroken] = useState<string | null>(null)
	const imgRef = useRef<HTMLImageElement>(null)
	const px = pxOf(size)
	const interactive = clickable || onClick != null
	const showImage = Boolean(src) && broken !== src
	useEffect(() => {
		const img = imgRef.current
		if (!src || !img) return
		if (img.complete && img.naturalWidth === 0) setBroken(src)
	}, [src])
	const box: CSSProperties = { width: px, height: px, ...style }
	const rootClass = classNames(
		'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-surface p-0 leading-none',
		interactive && 'cursor-pointer',
		className,
	)
	const body = showImage ? (
		<img
			ref={imgRef}
			src={src ?? undefined}
			alt=""
			className="h-full w-full object-cover"
			onError={() => {
				if (src) setBroken(src)
			}}
		/>
	) : (
		<span
			className="inline-flex h-full w-full items-center justify-center text-white"
			style={{ backgroundColor: color ?? colorOf(name), fontSize: Math.round(px * 0.55) }}
		>
			{letterOf(name)}
		</span>
	)

	if (interactive) {
		return (
			<button
				type={type}
				{...rest}
				disabled={disabled}
				className={rootClass}
				style={box}
				onClick={onClick}
			>
				{body}
			</button>
		)
	}

	return (
		<span {...rest} className={rootClass} style={box}>
			{body}
		</span>
	)
}
