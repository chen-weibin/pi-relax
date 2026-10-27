import classNames from 'classnames'
import {
	FloatingFocusManager,
	FloatingOverlay,
	FloatingPortal,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
	useTransitionStatus,
} from '@floating-ui/react'
import { useState, type CSSProperties, type ReactNode } from 'react'

const OPEN_MS = 200
const CLOSE_MS = 220

export type ModalAlign = 'center' | 'top'

export type ModalProps = {
	children: ReactNode
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	/** Click the backdrop to close. Default `true`. */
	closeOnBackdrop?: boolean
	/** Escape to close. Default `true`. */
	closeOnEscape?: boolean
	/** `center` centers both axes. `top` centers horizontally and offsets from the top. */
	align?: ModalAlign
	/** Pixels from the viewport top when `align` is `top`. Default `80`. */
	top?: number
	/** Extra classes on the box that wraps `children`. */
	className?: string
	/** Inline styles on the box that wraps `children`. */
	style?: CSSProperties
	'aria-labelledby'?: string
}

export function Modal({
	children,
	open: controlledOpen,
	defaultOpen = false,
	onOpenChange,
	closeOnBackdrop = true,
	closeOnEscape = true,
	align = 'center',
	top = 80,
	className,
	style,
	'aria-labelledby': ariaLabelledBy,
}: ModalProps) {
	const isControlled = controlledOpen !== undefined
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
	const open = isControlled ? controlledOpen : uncontrolledOpen

	const setOpen = (next: boolean) => {
		if (!isControlled) setUncontrolledOpen(next)
		onOpenChange?.(next)
	}

	const { context, refs } = useFloating({ open, onOpenChange: setOpen })
	const dismiss = useDismiss(context, {
		outsidePress: closeOnBackdrop,
		escapeKey: closeOnEscape,
		outsidePressEvent: 'mousedown',
	})
	const role = useRole(context)
	const { getFloatingProps } = useInteractions([dismiss, role])
	const { isMounted, status } = useTransitionStatus(context, {
		duration: { open: OPEN_MS, close: CLOSE_MS },
	})

	if (!isMounted) return null

	const motionStyle: CSSProperties = {
		transitionDuration: status === 'initial' ? '0ms' : status === 'close' ? `${CLOSE_MS}ms` : `${OPEN_MS}ms`,
		transitionTimingFunction:
			status === 'close' ? 'cubic-bezier(0.4, 0, 1, 1)' : 'cubic-bezier(0, 0, 0.2, 1)',
	}

	return (
		<FloatingPortal>
			<FloatingOverlay
				lockScroll
				data-status={status}
				style={{
					...motionStyle,
					...(align === 'top' ? { paddingTop: top } : {}),
				}}
				className={classNames(
					'z-[100] flex flex-col items-center bg-black/70 px-6 outline-none',
					align === 'center' ? 'justify-center' : 'justify-start',
					'transition-opacity motion-reduce:transition-none',
					'data-[status=initial]:opacity-0',
					'data-[status=open]:opacity-100',
					'data-[status=close]:opacity-0',
				)}
			>
				<FloatingFocusManager context={context}>
					<div
						ref={refs.setFloating}
						data-status={status}
						{...getFloatingProps(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : undefined)}
						style={{ ...motionStyle, ...style }}
						className={classNames(
							'bg-app border border-border-hover rounded-lg shadow-lg text-sm text-fg-2 outline-none',
							'origin-center transition-[opacity,scale,translate] motion-reduce:transition-none',
							'data-[status=initial]:translate-y-2 data-[status=initial]:scale-95 data-[status=initial]:opacity-0',
							'data-[status=open]:translate-y-0 data-[status=open]:scale-100 data-[status=open]:opacity-100',
							'data-[status=close]:translate-y-2 data-[status=close]:scale-95 data-[status=close]:opacity-0',
							className,
						)}
					>
						{children}
					</div>
				</FloatingFocusManager>
			</FloatingOverlay>
		</FloatingPortal>
	)
}
