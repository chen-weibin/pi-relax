import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatReadLines, parseReadArgs } from './readArgs.ts'

describe('read line label', () => {
	it('omits the range when neither offset nor limit is set', () => {
		assert.equal(formatReadLines(undefined, undefined), '')
		assert.equal(parseReadArgs({ path: 'src/index.ts' }).lineLabel, '')
		assert.equal(parseReadArgs({ path: 'src/index.ts', offset: null, limit: null }).lineLabel, '')
	})

	it('starts at line 1 when only limit is set', () => {
		assert.equal(formatReadLines(undefined, 20), 'L1-20')
	})

	it('shows the start line when only offset is set', () => {
		assert.equal(formatReadLines(12, undefined), 'L12')
	})

	it('ends at offset + limit - 1 when both are set', () => {
		assert.equal(formatReadLines(1, 20), 'L1-20')
		assert.deepEqual(parseReadArgs({ path: 'src/app/index.ts', offset: 1, limit: 20 }), {
			path: 'src/app/index.ts',
			name: 'index.ts',
			offset: 1,
			limit: 20,
			lineLabel: 'L1-20',
		})
	})

	it('returns empty while arguments are still streaming', () => {
		assert.deepEqual(parseReadArgs(null), { path: '', name: '', lineLabel: '' })
	})
})
