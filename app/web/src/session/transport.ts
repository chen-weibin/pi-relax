export type HistoryPhase = 'idle' | 'loading' | 'ready' | 'error'

export type TransportState<E> = {
	openSessionId: string | null
	phase: HistoryPhase
	generation: number
	/** 历史已经 replace 进 runtime 之后才为 true。在此之前事件留在 queue。 */
	live: boolean
	queue: E[]
}

export type TransportEffect =
	| { type: 'load-lists' }
	| { type: 'load-history'; sessionId: string; generation: number }

export function createTransportState<E>(): TransportState<E> {
	return { openSessionId: null, phase: 'idle', generation: 0, live: false, queue: [] }
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
		state: { ...state, phase: 'loading', generation, live: false, queue: [] },
		effects,
	}
}

/** 换一条，或当前这条还没对齐成功时，清空队列再拉历史。 */
/** 选中内存草稿时清掉真实会话。不产生加载。已经是空的则原样返回，避免把进行中的代际加一。 */
export function clearOpenSession<E>(state: TransportState<E>): TransportState<E> {
	if (state.openSessionId === null && state.phase === 'idle' && state.queue.length === 0) return state
	return { openSessionId: null, phase: 'idle', generation: state.generation + 1, live: false, queue: [] }
}

export function selectSession<E>(
	state: TransportState<E>,
	sessionId: string,
): { state: TransportState<E>; effects: TransportEffect[] } {
	if (state.openSessionId === sessionId && (state.phase === 'loading' || state.phase === 'ready')) {
		return { state, effects: [] }
	}
	const generation = state.generation + 1
	return {
		state: { openSessionId: sessionId, phase: 'loading', generation, live: false, queue: [] },
		effects: [{ type: 'load-history', sessionId, generation }],
	}
}

/**
 * 历史响应已经到手，但还不能画进 runtime。
 * 有消息时丢掉响应前的队列（那些增量已经在 history 里）。没有消息时整段留下，等放行时重放。
 */
export function historyArrived<E>(state: TransportState<E>, generation: number, hasMessages: boolean): TransportState<E> {
	if (generation !== state.generation || state.phase !== 'loading') return state
	return { ...state, phase: 'ready', live: false, queue: hasMessages ? [] : state.queue }
}

/** replace 完成。交出此前积下的事件，之后的 push 直接转发。 */
export function releaseLive<E>(
	state: TransportState<E>,
	generation: number,
): { state: TransportState<E>; replay: E[] } {
	if (generation !== state.generation || state.phase !== 'ready' || state.live) return { state, replay: [] }
	return { state: { ...state, live: true, queue: [] }, replay: state.queue }
}

export function historyFailed<E>(state: TransportState<E>, generation: number): TransportState<E> {
	if (generation !== state.generation || state.phase !== 'loading') return state
	return { ...state, phase: 'error', live: false, queue: [] }
}

/** 非当前会话丢掉。还没 replace 完时入队。已经放行则原样交出，不在这里合并帧。 */
export function pushEvent<E>(
	state: TransportState<E>,
	sessionId: string,
	event: E,
): { state: TransportState<E>; forward: E | null } {
	if (sessionId !== state.openSessionId || (state.phase !== 'loading' && state.phase !== 'ready')) {
		return { state, forward: null }
	}
	if (!state.live) {
		return { state: { ...state, queue: [...state.queue, event] }, forward: null }
	}
	return { state, forward: event }
}
