export type HistoryPhase = 'idle' | 'loading' | 'ready' | 'error'

export type TransportState<E> = {
	openSessionId: string | null
	phase: HistoryPhase
	generation: number
	queue: E[]
}

export type TransportEffect =
	| { type: 'load-lists' }
	| { type: 'load-history'; sessionId: string; generation: number }

export function createTransportState<E>(): TransportState<E> {
	return { openSessionId: null, phase: 'idle', generation: 0, queue: [] }
}

/** 第一次打开不拉列表。之后的打开重拉列表，有当前会话则重新对齐。 */
export function onSseOpen<E>(
	state: TransportState<E>,
	first: boolean,
): { state: TransportState<E>; effects: TransportEffect[] } {
	if (first) return { state, effects: [] }
	const effects: TransportEffect[] = [{ type: 'load-lists' }]
	if (!state.openSessionId) return { state, effects }
	const generation = state.generation + 1
	effects.push({ type: 'load-history', sessionId: state.openSessionId, generation })
	return {
		state: { ...state, phase: 'loading', generation, queue: [] },
		effects,
	}
}

/** 换一条，或当前这条还没对齐成功时，清空队列再拉历史。 */
export function selectSession<E>(
	state: TransportState<E>,
	sessionId: string,
): { state: TransportState<E>; effects: TransportEffect[] } {
	if (state.openSessionId === sessionId && (state.phase === 'loading' || state.phase === 'ready')) {
		return { state, effects: [] }
	}
	const generation = state.generation + 1
	return {
		state: { openSessionId: sessionId, phase: 'loading', generation, queue: [] },
		effects: [{ type: 'load-history', sessionId, generation }],
	}
}

export function historyLoaded<E>(
	state: TransportState<E>,
	generation: number,
): { state: TransportState<E>; replay: E[] } {
	if (generation !== state.generation || state.phase !== 'loading') return { state, replay: [] }
	return { state: { ...state, phase: 'ready', queue: [] }, replay: state.queue }
}

export function historyFailed<E>(state: TransportState<E>, generation: number): TransportState<E> {
	if (generation !== state.generation || state.phase !== 'loading') return state
	return { ...state, phase: 'error', queue: [] }
}

/** 非当前会话丢掉。历史未落地时入队。已对齐则原样交出，不在这里合并帧。 */
export function pushEvent<E>(
	state: TransportState<E>,
	sessionId: string,
	event: E,
): { state: TransportState<E>; forward: E | null } {
	if (sessionId !== state.openSessionId || (state.phase !== 'loading' && state.phase !== 'ready')) {
		return { state, forward: null }
	}
	if (state.phase === 'loading') {
		return { state: { ...state, queue: [...state.queue, event] }, forward: null }
	}
	return { state, forward: event }
}
