import { useLayoutEffect, useRef } from 'react'
import { acquireTerminalRuntime, parkTerminalRuntime } from './runtime'

export function XtermSession({ sessionId }: { sessionId: string }) {
	const hostRef = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const host = hostRef.current
		if (!host) return

		const runtime = acquireTerminalRuntime(sessionId)
		host.appendChild(runtime.element)

		const applyFit = () => runtime.fit()
		const ro = new ResizeObserver(applyFit)
		ro.observe(host)

		let raf2 = 0
		const raf1 = requestAnimationFrame(() => {
			applyFit()
			raf2 = requestAnimationFrame(() => {
				applyFit()
				runtime.focus()
			})
		})

		return () => {
			cancelAnimationFrame(raf1)
			cancelAnimationFrame(raf2)
			ro.disconnect()
			parkTerminalRuntime(runtime)
		}
	}, [sessionId])

	return (
		<div className="h-full min-h-0 w-full p-2">
			<div ref={hostRef} className="h-full min-h-0 w-full" />
		</div>
	)
}
