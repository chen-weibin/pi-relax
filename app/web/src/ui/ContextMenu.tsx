import classNames from 'classnames'
import {
	FloatingNode,
	FloatingPortal,
	FloatingTree,
	autoUpdate,
	flip,
	offset,
	shift,
	useDismiss,
	useFloating,
	useFloatingNodeId,
	useFloatingParentNodeId,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { cloneElement, isValidElement, useContext, useState, type MouseEvent, type ReactElement } from 'react'
import { CloseMenu, DropdownList, type DropdownPanel } from './Dropdown'

export type ContextMenuProps = {
	children: ReactElement
	panel: DropdownPanel
	className?: string
}

const shellClass =
	'z-[99] flex max-h-80 flex-col bg-sidebar border border-border-hover rounded-lg p-1 shadow-lg text-sm text-fg-2 outline-none'

export function ContextMenu(props: ContextMenuProps) {
	const parentId = useFloatingParentNodeId()
	if (parentId == null) {
		return (
			<FloatingTree>
				<ContextMenuFrame {...props} />
			</FloatingTree>
		)
	}
	return <ContextMenuFrame {...props} />
}

function ContextMenuFrame({ children, panel, className }: ContextMenuProps) {
	const nodeId = useFloatingNodeId()
	const closeParent = useContext(CloseMenu)
	const [open, setOpen] = useState(false)
	const closeAll = () => {
		setOpen(false)
		closeParent()
	}

	const { context, floatingStyles, refs } = useFloating({
		nodeId,
		open,
		onOpenChange: setOpen,
		placement: 'bottom-start',
		strategy: 'fixed',
		middleware: [offset(6), flip(), shift({ padding: 4 })],
		whileElementsMounted: autoUpdate,
	})

	const { getFloatingProps } = useInteractions([
		useDismiss(context, { outsidePress: true, escapeKey: true, bubbles: { outsidePress: true, escapeKey: false } }),
		useRole(context, { role: 'menu' }),
	])

	if (!isValidElement(children)) {
		throw new Error('[ContextMenu] `children` must be a single React element.')
	}
	const trigger = children as ReactElement<{ onContextMenu?: (event: MouseEvent) => void }>
	const openAt = (event: MouseEvent) => {
		trigger.props.onContextMenu?.(event)
		if (event.defaultPrevented) return
		event.preventDefault()
		const { clientX, clientY } = event
		refs.setPositionReference({
			getBoundingClientRect() {
				return new DOMRect(clientX, clientY, 0, 0)
			},
		})
		setOpen(true)
	}

	return (
		<CloseMenu.Provider value={closeAll}>
			<FloatingNode id={nodeId}>
				{cloneElement(trigger, { onContextMenu: openAt })}
				{open && (
					<FloatingPortal>
						<div
							ref={refs.setFloating}
							style={panel.width === undefined ? floatingStyles : { ...floatingStyles, width: panel.width }}
							{...getFloatingProps({
								onContextMenu(event: MouseEvent) {
									event.preventDefault()
								},
							})}
							className={classNames(shellClass, className)}
						>
							<DropdownList panel={panel} />
						</div>
					</FloatingPortal>
				)}
			</FloatingNode>
		</CloseMenu.Provider>
	)
}
