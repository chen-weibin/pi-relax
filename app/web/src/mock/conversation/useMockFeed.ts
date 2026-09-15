import { useCallback, useRef } from 'react'
import type { BlockRuntime } from '../../conversation'
import { HISTORY_MESSAGES } from './history'
import { buildMockStreamEvents, playMockStream } from './stream'

/** Temporary: drives history replace / streamed apply. Remove with DevToolbar. */
export function useMockFeed(runtime: BlockRuntime) {
	const roundRef = useRef(0)
	const stopRef = useRef<(() => void) | null>(null)

	const stopLive = useCallback(() => {
		if (!stopRef.current) return
		stopRef.current()
		stopRef.current = null
		runtime.apply({ type: 'run_end' })
	}, [runtime])

	const loadHistory = useCallback(() => {
		stopLive()
		runtime.replace(HISTORY_MESSAGES)
	}, [runtime, stopLive])

	const playStream = useCallback(() => {
		stopRef.current?.()
		stopRef.current = null
		runtime.replace([])
		roundRef.current += 1
		const events = buildMockStreamEvents(roundRef.current)
		stopRef.current = playMockStream(events, runtime.apply, () => {
			stopRef.current = null
		})
	}, [runtime])

	return { loadHistory, playStream }
}
