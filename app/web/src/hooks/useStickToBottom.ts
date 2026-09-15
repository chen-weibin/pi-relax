import { useEffect, useRef } from 'react'

const PIN_THRESHOLD_PX = 48

function isPinned(el: HTMLElement) {
	return el.scrollHeight - el.scrollTop - el.clientHeight < PIN_THRESHOLD_PX
}

/**
 * Stick the scroller to the bottom while the user is pinned there.
 * Observes content size (typewriter / markdown growth) via ResizeObserver.
 * `revision` is an explicit content generation — do not pass a whole snapshot.
 */
export function useStickToBottom(revision: number) {
	const scrollerRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const pinnedRef = useRef(true)
	const programmaticRef = useRef(false)
	const clearProgrammaticRef = useRef(0)

	const stickRef = useRef(() => {})
	stickRef.current = () => {
		const scroller = scrollerRef.current
		if (!scroller || !pinnedRef.current) return
		programmaticRef.current = true
		scroller.scrollTop = scroller.scrollHeight
		cancelAnimationFrame(clearProgrammaticRef.current)
		clearProgrammaticRef.current = requestAnimationFrame(() => {
			clearProgrammaticRef.current = requestAnimationFrame(() => {
				programmaticRef.current = false
			})
		})
	}

	useEffect(() => {
		const el = scrollerRef.current
		if (!el) return
		const onScroll = () => {
			if (programmaticRef.current) return
			pinnedRef.current = isPinned(el)
		}
		el.addEventListener('scroll', onScroll, { passive: true })
		return () => el.removeEventListener('scroll', onScroll)
	}, [])

	useEffect(() => {
		const scroller = scrollerRef.current
		const content = contentRef.current
		if (!scroller) return
		const onResize = () => stickRef.current()
		const observer = new ResizeObserver(onResize)
		observer.observe(scroller)
		if (content) observer.observe(content)
		return () => {
			observer.disconnect()
			cancelAnimationFrame(clearProgrammaticRef.current)
		}
	}, [])

	useEffect(() => {
		stickRef.current()
	}, [revision])

	return { scrollerRef, contentRef }
}
