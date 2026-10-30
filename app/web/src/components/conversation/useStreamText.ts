import { useEffect, useRef, useState } from 'react'

const INTERVAL_MS = 32

/** 流式时最多每 32ms 交出一次最新文本。结束后立刻用最终文本。 */
export function useStreamText(text: string, streaming: boolean): string {
	const textRef = useRef(text)
	const timer = useRef(0)
	const [shown, setShown] = useState(text)
	textRef.current = text

	useEffect(() => {
		if (!streaming) {
			if (timer.current) {
				window.clearTimeout(timer.current)
				timer.current = 0
			}
			setShown(text)
			return
		}
		if (timer.current) return
		timer.current = window.setTimeout(() => {
			timer.current = 0
			setShown(textRef.current)
		}, INTERVAL_MS)
	}, [text, streaming])

	useEffect(() => {
		return () => {
			if (!timer.current) return
			window.clearTimeout(timer.current)
			timer.current = 0
		}
	}, [])

	if (!streaming) return text
	return shown
}

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
