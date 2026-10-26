import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { draftTarget, ensureDraft } from './draft.ts'
import { placeNewProject } from './groupCatalog.ts'
import { clearOpenSession, createTransportState, selectSession } from './transport.ts'

describe('session drafts', () => {
	it('keeps one draft per directory and prefers the open session', () => {
		const first = ensureDraft([], '/proj', 1)
		const again = ensureDraft(first, '/proj', 9)
		assert.equal(again, first)
		assert.equal(again[0]?.createdAt, 1)
		assert.equal(draftTarget('/open', '/draft', '/default'), '/open')
		assert.equal(draftTarget(null, '/draft', '/default'), '/draft')
		assert.equal(draftTarget(null, null, '/default'), '/default')
		assert.equal(draftTarget(null, null, null), null)
	})

	it('clears the open session without a load, and leaves an empty state alone', () => {
		const selected = selectSession(createTransportState<string>(), 'a')
		const cleared = clearOpenSession(selected.state)
		assert.equal(cleared.openSessionId, null)
		assert.equal(cleared.phase, 'idle')
		assert.equal(cleared.queue.length, 0)
		assert.equal(cleared.generation, selected.state.generation + 1)
		assert.equal(clearOpenSession(cleared), cleared)
	})

	it('puts a newly registered project at the front once', () => {
		const existing = { id: 'p', cwd: '/old', name: 'old', position: 1, created: '', modified: '' }
		const created = { id: 'n', cwd: '/new', name: 'new', position: 2, created: '', modified: '' }
		const placed = placeNewProject([existing], created)
		assert.equal(placed[0]?.cwd, '/new')
		assert.equal(placeNewProject(placed, created), placed)
	})
})
