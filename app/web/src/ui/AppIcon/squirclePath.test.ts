import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getSquirclePath } from './squirclePath.ts'

describe('getSquirclePath', () => {
	it('uses the Apple icon radius (22.37%) and iOS smoothing (0.6)', () => {
		const d = getSquirclePath(100, 100, 100 * 0.2237, 0.6)
		assert.ok(d.startsWith('M 64.2080 0'), d)
		assert.ok(d.includes('a 22.3700 22.3700 0 0 1'), d)
	})

	it('stays inside the viewBox', () => {
		const d = getSquirclePath(100, 100, 100 * 0.2237, 0.6)
		const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
		assert.ok(numbers.every((value) => Math.abs(value) <= 100), d)
	})
})
