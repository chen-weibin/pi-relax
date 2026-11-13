import type { ReactNode } from 'react'
import classNames from 'classnames'
import { ShinyText } from './ShinyText'

export type TitleRowProps = {
	title: string
	/** 标题后面的说明。太长时省略，标题不裁。 */
	desc?: string
	/** 标题走扫光。扫光自己带颜色，不跟着 hover 再变一次。 */
	shimmer?: boolean
	/** 不是按钮：点不动，hover 也不变色。 */
	disabled?: boolean
	onClick?: () => void
	className?: string
}

/**
 * 一行标题 + 说明。
 *
 * 可点时整行是热区。常态标题比说明亮，hover 两者都提亮，标题仍更亮一档。
 */
export function TitleRow({ title, desc, shimmer = false, disabled = false, onClick, className }: TitleRowProps) {
	const clickable = !disabled && onClick != null
	const titleNode: ReactNode = shimmer ? (
		<ShinyText text={title} speed={2} color="var(--fg-3)" shineColor="var(--fg-bright)" />
	) : (
		title
	)
	const body = (
		<>
			<span
				className={classNames(
					'shrink-0 text-base text-fg-3',
					clickable && !shimmer && 'group-hover/title-row:text-fg',
				)}
			>
				{titleNode}
			</span>
			{desc ? (
				<span
					className={classNames(
						'ml-2 min-w-0 truncate text-base text-fg-disabled',
						clickable && 'group-hover/title-row:text-fg-3',
					)}
				>
					{desc}
				</span>
			) : null}
		</>
	)
	const rowClass = classNames(
		'flex w-full min-w-0 items-center whitespace-nowrap rounded-sm py-0.5 text-left',
		clickable ? 'group/title-row cursor-pointer' : 'cursor-default',
		className,
	)

	if (!clickable) return <div className={rowClass}>{body}</div>

	return (
		<button type="button" onClick={onClick} className={rowClass}>
			{body}
		</button>
	)
}
