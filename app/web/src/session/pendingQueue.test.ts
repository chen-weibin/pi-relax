import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { enqueue, removePending, takeHead, type PendingMessage } from './pendingQueue.ts'

const first: PendingMessage = { id: 'a', text: 'one' }
const second: PendingMessage = { id: 'b', text: 'two' }

describe('pending queue', () => {
	it('appends, drops one row, and takes the head', () => {
		const queued = enqueue(enqueue([], first), second)
		assert.deepEqual(
			queued.map((item) => item.id),
			['a', 'b'],
		)
		assert.deepEqual(
			removePending(queued, 'a').map((item) => item.id),
			['b'],
		)
		const taken = takeHead(queued)
		assert.equal(taken?.head.id, 'a')
		assert.deepEqual(
			taken?.rest.map((item) => item.id),
			['b'],
		)
		assert.equal(takeHead([]), null)
	})
})
