import { useEffect, useRef, useState } from 'react'
import { FRAME_MS, advanceShown, defaultFeed, type FeedConfig } from '../../chat/pace.ts'

/**
 * 只有挂载时还是空的、并且正在流式，才逐字淡入。
 * 切回来时正文已经在历史里，再开动画会把同一段字再画一层。
 */
export function nextStreamAnimate(allow: boolean | null, streaming: boolean, textLength: number): boolean {
	if (allow !== null) return allow
	return streaming && textLength === 0
}

export function useStreamAnimate(streaming: boolean, textLength: number): boolean {
	const allow = useRef<boolean | null>(null)
	allow.current = nextStreamAnimate(allow.current, streaming, textLength)
	return streaming && allow.current
}

/** 正式对话用 /chat 定下的默认节奏。试验页可以传入另一份 feed。 */
export function useStreamText(text: string, streaming: boolean, feed: FeedConfig = defaultFeed): string {
	const textRef = useRef(text)
	const shownRef = useRef(streaming && feed.mode === 'pace' ? '' : text)
	const timer = useRef(0)
	const [shown, setShown] = useState(shownRef.current)
	textRef.current = text
	const direct = feed.mode === 'direct'
	const frames = Math.max(1, Math.round(feed.frames))
	const lag = feed.lag
	const step = feed.step

	useEffect(() => {
		const stop = () => {
			if (!timer.current) return
			window.clearTimeout(timer.current)
			timer.current = 0
		}
		if (!streaming || direct) {
			stop()
			shownRef.current = text
			setShown(text)
			return
		}
		if (!text.startsWith(shownRef.current)) shownRef.current = ''
		const tick = () => {
			const next = advanceShown(textRef.current, shownRef.current, true, { lag, step })
			shownRef.current = next
			setShown(next)
			if (next.length < textRef.current.length) timer.current = window.setTimeout(tick, frames * FRAME_MS)
			else timer.current = 0
		}
		if (timer.current || shownRef.current.length >= text.length) return stop
		timer.current = window.setTimeout(tick, frames * FRAME_MS)
		return stop
	}, [text, streaming, direct, frames, lag, step])

	if (!streaming || direct) return text
	return shown
}
