import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from 'react'
import { DisclosureRow } from '../../ui/DisclosureRow'
import { TrailText } from '../../ui/TrailText'

export type ExploreGroupHandle = {
	reveal: (key: string) => void
}

export const ExploreGroup = forwardRef<
	ExploreGroupHandle,
	{ trail: string | null; children: ReactNode; onOpenChange?: (open: boolean) => void }
>(function ExploreGroup({ trail, children, onOpenChange }, ref) {
	const [open, setOpen] = useState(false)
	const [focusKey, setFocusKey] = useState<string | null>(null)
	const changeOpen = (next: boolean) => {
		setOpen(next)
		onOpenChange?.(next)
	}

	useImperativeHandle(ref, () => ({
		reveal(key: string) {
			changeOpen(true)
			setFocusKey(key)
		},
	}))

	useEffect(() => {
		if (!open || !focusKey) return
		const timer = window.setTimeout(() => {
			document.querySelector(`[data-block-key="${CSS.escape(focusKey)}"]`)?.scrollIntoView({ block: 'nearest' })
		}, 250)
		return () => window.clearTimeout(timer)
	}, [open, focusKey])

	const title = (
		<span className="inline-flex items-baseline gap-2">
			探索
			{trail ? <TrailText text={trail} /> : null}
		</span>
	)
	return (
		<DisclosureRow title={title} open={open} chevron="hover" onOpenChange={changeOpen}>
			<div className="flex flex-col gap-0.5 pt-1">{children}</div>
		</DisclosureRow>
	)
})
