import { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'

export type TypewriterTextProps = {
	text: string
	playing: boolean
	charsPerSec?: number
	className?: string
	onCaughtUp?: () => void
}

const graphemeSegmenter =
	typeof Intl !== 'undefined' && 'Segmenter' in Intl
		? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
		: null

function segment(text: string): string[] {
	if (!text) return []
	if (graphemeSegmenter) {
		return [...graphemeSegmenter.segment(text)].map((part) => part.segment)
	}
	return Array.from(text)
}

type GraphemeCache = { text: string; parts: string[] }

function syncGraphemes(cache: GraphemeCache, text: string): string[] {
	if (cache.text === text) return cache.parts
	if (text.startsWith(cache.text)) {
		cache.parts = cache.parts.concat(segment(text.slice(cache.text.length)))
		cache.text = text
		return cache.parts
	}
	cache.parts = segment(text)
	cache.text = text
	return cache.parts
}

export function TypewriterText({
	text,
	playing,
	charsPerSec = 48,
	className,
	onCaughtUp,
}: TypewriterTextProps) {
	const textRef = useRef(text)
	textRef.current = text
	const playingRef = useRef(playing)
	playingRef.current = playing
	const cacheRef = useRef<GraphemeCache>({ text: '', parts: [] })
	const shownRef = useRef(playing ? 0 : Number.POSITIVE_INFINITY)
	const [shown, setShown] = useState(shownRef.current)
	const caughtRef = useRef(false)
	const onCaughtUpRef = useRef(onCaughtUp)
	onCaughtUpRef.current = onCaughtUp

	useEffect(() => {
		if (!playing) {
			shownRef.current = Number.POSITIVE_INFINITY
			setShown(Number.POSITIVE_INFINITY)
			caughtRef.current = false
			return
		}

		let raf = 0
		let last = performance.now()
		let carry = 0
		let cancelled = false

		const tick = (now: number) => {
			if (cancelled || !playingRef.current) return
			const parts = syncGraphemes(cacheRef.current, textRef.current)
			carry += (charsPerSec * (now - last)) / 1000
			last = now
			const step = Math.floor(carry)
			if (step > 0) {
				carry -= step
				shownRef.current = Math.min(parts.length, shownRef.current + step)
				setShown(shownRef.current)
			}
			if (shownRef.current >= parts.length) {
				if (!caughtRef.current) {
					caughtRef.current = true
					onCaughtUpRef.current?.()
				}
				return
			}
			raf = requestAnimationFrame(tick)
		}

		const parts = syncGraphemes(cacheRef.current, text)
		if (shownRef.current >= parts.length) {
			if (!caughtRef.current) {
				caughtRef.current = true
				onCaughtUpRef.current?.()
			}
			return
		}

		caughtRef.current = false
		raf = requestAnimationFrame(tick)
		return () => {
			cancelled = true
			cancelAnimationFrame(raf)
		}
	}, [playing, charsPerSec, text])

	let visible = text
	if (playing) {
		const parts = syncGraphemes(cacheRef.current, text)
		visible = parts.slice(0, shown).join('')
	}

	return (
		<div className={classNames('whitespace-pre-wrap text-fg-2 text-sm', className)}>
			{visible}
		</div>
	)
}
