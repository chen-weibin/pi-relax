import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createTransportState, historyArrived, pushEvent, releaseLive, selectSession } from './transport.ts'

describe('session transport replay', () => {
	it('drops the pre-response queue when history already has messages', () => {
		let state = selectSession(createTransportState<string>(), 'a').state
		state = pushEvent(state, 'a', '1').state
		state = pushEvent(state, 'a', '2').state
		state = historyArrived(state, state.generation, true)
		assert.deepEqual(state.queue, [])
		const held = pushEvent(state, 'a', '3')
		assert.equal(held.forward, null)
		const released = releaseLive(held.state, held.state.generation)
		assert.deepEqual(released.replay, ['3'])
		assert.equal(pushEvent(released.state, 'a', '4').forward, '4')
	})

	it('replays the whole queue when history is empty', () => {
		let state = selectSession(createTransportState<string>(), 'a').state
		state = pushEvent(state, 'a', '1').state
		state = historyArrived(state, state.generation, false)
		state = pushEvent(state, 'a', '2').state
		assert.deepEqual(releaseLive(state, state.generation).replay, ['1', '2'])
	})
})
