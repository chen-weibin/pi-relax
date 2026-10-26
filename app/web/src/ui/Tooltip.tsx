import type { Placement } from '@floating-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { Popover } from './Popover'

export type TooltipProps = {
	title?: ReactNode
	children: ReactElement
	placement?: Placement
	delay?: number
}

function hasTitle(title: ReactNode): boolean {
	return title != null && title !== false && title !== ''
}

export function Tooltip({ title, children, placement = 'top', delay = 400 }: TooltipProps) {
	if (!hasTitle(title)) return children
	return (
		<Popover
			trigger={['hover']}
			role="tooltip"
			placement={placement}
			interactive={false}
			openDelay={delay}
			className="pointer-events-none rounded-sm!"
			content={<div className="px-3 py-1.5">{title}</div>}
		>
			{children}
		</Popover>
	)
}
