import classNames from 'classnames'
import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { CloseIcon } from '../icons'
import { IconButton } from '../ui/IconButton'
import { Popover } from '../ui/Popover'

export type AssistantErrorNoticeProps = {
	message: string | null
	onDismiss: () => void
	children: ReactElement
	className?: string
}

export function AssistantErrorNotice({ message, onDismiss, children, className }: AssistantErrorNoticeProps) {
	const anchorRef = useRef<HTMLDivElement>(null)
	const [width, setWidth] = useState(0)

	useLayoutEffect(() => {
		const node = anchorRef.current
		if (!node) return
		const measure = () => setWidth(node.offsetWidth)
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(node)
		return () => observer.disconnect()
	}, [])

	return (
		<Popover
			placement="top-start"
			width={width || undefined}
			open={message !== null}
			onOpenChange={(open) => {
				if (!open) onDismiss()
			}}
			trigger={[]}
			className="p-2"
			content={
				<div className="relative">
					<p className="min-h-10 pr-6 leading-5">{message}</p>
					<IconButton title="关闭" size="sm" className="absolute top-0 right-0" onClick={onDismiss}>
						<CloseIcon />
					</IconButton>
				</div>
			}
		>
			<div ref={anchorRef} className={classNames('min-w-0', className)}>
				{children}
			</div>
		</Popover>
	)
}
