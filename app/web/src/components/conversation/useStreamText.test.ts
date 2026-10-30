import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nextStreamAnimate } from './useStreamText.ts'

describe('stream animate latch', () => {
	it('fades only a block that starts empty while streaming', () => {
		assert.equal(nextStreamAnimate(null, true, 0), true)
		assert.equal(nextStreamAnimate(null, true, 12), false)
		assert.equal(nextStreamAnimate(null, false, 0), false)
	})

	it('does not start fading after a restored block later reopens', () => {
		const restored = nextStreamAnimate(null, false, 40)
		assert.equal(restored, false)
		assert.equal(nextStreamAnimate(restored, true, 0), false)
		assert.equal(nextStreamAnimate(true, false, 8), true)
	})
})