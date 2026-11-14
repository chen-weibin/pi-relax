import classNames from 'classnames'
import type { CSSProperties, ReactNode } from 'react'
import { SiteMark, type SiteMarkSize } from './SiteMark'
import { Tooltip } from './Tooltip'

/** 与 SiteMark 的 sm / md / lg 同一套像素。 */
const SIZE_PX: Record<SiteMarkSize, number> = {
	sm: 16,
	md: 20,
	lg: 24,
}

export type SourceChipProps = {
	name: string
	/** 图片地址。空或加载失败时走首字圆。组件不关心这张图从哪来。 */
	src?: string | null
	/** `sm` 16 / `md` 20 / `lg` 24，或自定义像素。高度等于左侧圆图直径。 */
	size?: SiteMarkSize | number
	/** 为 true，或传入 `onClick` 时，根节点是 `button`。 */
	clickable?: boolean
	onClick?: () => void
	/** 有内容才包 Tooltip。不传则没有悬停说明。 */
	tooltip?: ReactNode
	className?: string
	style?: CSSProperties
}

function pxOf(size: SiteMarkSize | number): number {
	return typeof size === 'number' ? size : SIZE_PX[size]
}

/** 来源胶囊：左侧圆图贴齐高度，右侧是名称。 */
export function SourceChip({
	name,
	src,
	size = 'md',
	clickable = false,
	onClick,
	tooltip,
	className,
	style,
}: SourceChipProps) {
	const px = pxOf(size)
	const interactive = clickable || onClick != null
	const rootClass = classNames(
		'inline-flex max-w-full items-center overflow-hidden rounded-full border-0 bg-surface-hover p-0 align-middle leading-none text-fg-2',
		interactive && 'cursor-pointer hover:bg-surface-active',
		className,
	)
	const rootStyle: CSSProperties = {
		height: px,
		fontSize: Math.max(11, Math.round(px * 0.6)),
		...style,
	}
	const body = (
		<>
			<SiteMark
				name={name}
				src={src}
				size={px}
				className="pointer-events-none"
				style={{ backgroundColor: 'transparent' }}
			/>
			<span
				className="max-w-[240px] min-w-0 truncate whitespace-nowrap"
				style={{ paddingLeft: Math.round(px * 0.35), paddingRight: Math.round(px * 0.55) }}
			>
				{name}
			</span>
		</>
	)
	const node = interactive ? (
		<button
			type="button"
			className={rootClass}
			style={rootStyle}
			onClick={(event) => {
				event.stopPropagation()
				onClick?.()
			}}
		>
			{body}
		</button>
	) : (
		<span className={rootClass} style={rootStyle}>
			{body}
		</span>
	)
	return <Tooltip title={tooltip}>{node}</Tooltip>
}
