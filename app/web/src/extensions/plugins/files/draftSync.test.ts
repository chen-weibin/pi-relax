import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	createDraftClock,
	editDraftClock,
	finishDraftWrite,
	openFileDiskAction,
	takeDraftWrite,
} from './draftSync.ts'

describe('draft sync', () => {
	it('schedules one write after edits inside 400ms', () => {
		let clock = createDraftClock('')
		clock = editDraftClock(clock, 'a', 0)
		clock = editDraftClock(clock, 'ab', 100)
		clock = editDraftClock(clock, 'abc', 200)
		assert.equal(takeDraftWrite(clock, 599).text, null)
		const due = takeDraftWrite(clock, 600)
		assert.equal(due.text, 'abc')
		assert.equal(due.clock.writing, 'abc')
	})

	it('queues another debounce when the draft moved during the write', () => {
		const clock = finishDraftWrite(
			{ draft: 'abcd', saved: '', dueAt: null, writing: 'abc' },
			'abc',
			1000,
		)
		assert.equal(clock.saved, 'abc')
		assert.equal(clock.writing, null)
		assert.equal(clock.dueAt, 1400)
	})

	it('does not replace a dirty buffer from disk', () => {
		assert.equal(openFileDiskAction(false, ['change']), 'reload')
		assert.equal(openFileDiskAction(true, ['change']), 'notice')
		assert.equal(openFileDiskAction(false, ['unlink']), 'gone')
		assert.equal(openFileDiskAction(true, ['unlink']), 'notice')
		assert.equal(openFileDiskAction(false, ['addDir']), 'keep')
	})
})
