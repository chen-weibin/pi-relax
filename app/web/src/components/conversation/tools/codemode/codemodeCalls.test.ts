import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readCodemodeCalls } from './codemodeCalls.ts'

describe('readCodemodeCalls', () => {
	it('keeps name, args, and status from details.calls', () => {
		const calls = readCodemodeCalls({
			calls: [
				{ id: 'a/0', name: 'read', args: '{"path":"a.ts"}', status: 'ok' },
				{ id: 'a/1', name: 'bash', args: '{"command":"ls"}', status: 'error', error: 'fail' },
			],
		})
		assert.equal(calls.length, 2)
		assert.deepEqual(calls[0], { id: 'a/0', name: 'read', args: '{"path":"a.ts"}', status: 'ok' })
		assert.equal(calls[1]?.error, 'fail')
	})

	it('returns nothing when calls are missing', () => {
		assert.deepEqual(readCodemodeCalls(undefined), [])
		assert.deepEqual(readCodemodeCalls({ calls: 'nope' }), [])
	})
})
