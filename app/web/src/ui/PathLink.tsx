import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import classNames from 'classnames'

export type PathLinkProps = {
	children: ReactNode
	onClick: () => void
	className?: string
}

/**
 * 标题旁可点的路径/文件名。字号小一档、禁用色，hover 下划线。
 * 用 span+role=link，避免嵌在 DisclosureRow 的 button 里再套 button。
 */
export function PathLink({ children, onClick, className }: PathLinkProps) {
	const activate = (event: MouseEvent | KeyboardEvent) => {
		event.stopPropagation()
		event.preventDefault()
		onClick()
	}

	return (
		<span
			role="link"
			tabIndex={0}
			className={classNames(
				'cursor-pointer text-sm text-fg-disabled hover:text-fg-3 hover:underline',
				className,
			)}
			onClick={activate}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') activate(event)
			}}
		>
			{children}
		</span>
	)
}
