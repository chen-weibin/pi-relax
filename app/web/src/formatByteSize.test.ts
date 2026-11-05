import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatByteSize } from './formatByteSize.ts'

describe('formatByteSize', () => {
	it('uses 1024 and drops a trailing decimal', () => {
		assert.equal(formatByteSize(0), '0 B')
		assert.equal(formatByteSize(512), '512 B')
		assert.equal(formatByteSize(1024), '1 KB')
		assert.equal(formatByteSize(1536), '1.5 KB')
		assert.equal(formatByteSize(18 * 1024 * 1024), '18 MB')
	})
})
