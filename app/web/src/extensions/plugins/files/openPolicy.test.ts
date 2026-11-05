import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { FileKind } from './fileKinds.ts'
import { FS_MAX_BYTES, openBlockReason, tooLargeReason, UNSUPPORTED_TYPE } from './openPolicy.ts'

const icon = () => null
const text: FileKind = { id: 'txt', icon, viewer: 'monaco', open: 'text', language: 'plaintext' }
const closed: FileKind = { id: 'image', icon, viewer: 'monaco', open: 'none' }

describe('open policy', () => {
	it('reads text at the limit and blocks anything larger or closed', () => {
		assert.equal(openBlockReason(text, 12), null)
		assert.equal(openBlockReason(text, FS_MAX_BYTES), null)
		assert.equal(openBlockReason(text, FS_MAX_BYTES + 1), tooLargeReason(FS_MAX_BYTES + 1))
		assert.equal(openBlockReason(closed, 12), UNSUPPORTED_TYPE)
		assert.equal(openBlockReason(closed, FS_MAX_BYTES + 1), UNSUPPORTED_TYPE)
	})
})
