import classNames from 'classnames'
import {
	FloatingPortal,
	autoUpdate,
	flip,
	offset,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useHover,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import type { Placement } from '@floating-ui/react'
import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react'

export type PopoverTrigger = 'click' | 'hover'

export type PopoverRole =
	| 'dialog'
	| 'alertdialog'
	| 'listbox'
	| 'menu'
	| 'tooltip'
	| 'grid'
	| 'tree'

export type PopoverProps = {
	children: ReactNode
	content: ReactNode
	trigger?: ('click' | 'hover')[]
	placement?: Placement
	offset?: number
	crossOffset?: number
	interactive?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	/** ARIA role for the floating element. Default `'dialog'`. */
	role?: PopoverRole
	className?: string
}

export function Popover({
	children,
	content,
	trigger = ['click'],
	placement = 'bottom-start',
	offset: offsetValue = 6,
	crossOffset = 0,
	interactive = false,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	role = 'dialog',
	className,
}: PopoverProps) {
	const isControlled = controlledOpen !== undefined
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
	const open = isControlled ? controlledOpen : uncontrolledOpen

	const setOpen = (next: boolean) => {
		if (!isControlled) setUncontrolledOpen(next)
		controlledOnOpenChange?.(next)
	}

	const { context, floatingStyles, refs } = useFloating({
		open,
		onOpenChange: setOpen,
		placement,
		middleware: [
			offset({ mainAxis: offsetValue, crossAxis: crossOffset }, [offsetValue, crossOffset]),
			flip(),
			shift({ padding: 4 }),
		],
		whileElementsMounted: autoUpdate,
	})

	const interactions = [
		trigger.includes('click') && useClick(context),
		trigger.includes('hover') &&
			useHover(context, {
				restMs: 50,
				delay: interactive ? { close: 100 } : 0,
				move: interactive ? false : true,
			}),
		useDismiss(context, { outsidePress: true, escapeKey: true }),
		useRole(context, { role }),
	].filter(Boolean) as Parameters<typeof useInteractions>[0]
	const { getReferenceProps, getFloatingProps } = useInteractions(interactions)

	if (!isValidElement(children)) {
		throw new Error('[Popover] `children` must be a single React element.')
	}
	const triggerElement = children as ReactElement<{ ref?: React.Ref<unknown> }>
	const triggerRef = (node: Element | null) => {
		refs.setReference(node)
		const originalRef = triggerElement.props.ref
		if (typeof originalRef === 'function') originalRef(node as never)
		else if (originalRef && 'current' in originalRef) {
			;(originalRef as React.MutableRefObject<Element | null>).current = node
		}
	}
	const clonedTrigger = cloneElement(triggerElement, {
		ref: triggerRef,
		...getReferenceProps(triggerElement.props as Record<string, unknown>),
	} as Record<string, unknown>)

	return (
		<>
			{clonedTrigger}
			{open && (
				<FloatingPortal>
					<div
						ref={(node) => {
							refs.setFloating(node)
						}}
						style={floatingStyles}
						{...getFloatingProps()}
						className={classNames(
							'z-[99] bg-sidebar border border-border-hover rounded-lg shadow-lg text-sm text-fg-2 outline-none',
							className,
						)}
					>
						{content}
					</div>
				</FloatingPortal>
			)}
		</>
	)
}
