import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { noteCatalogEvent } from './catalogEvent.ts'

const at = 1_700_000_000_000

function assistant(stopReason: string): { role: 'assistant'; stopReason: string } {
	return { role: 'assistant', stopReason }
}

describe('catalog event notes', () => {
	it('patches run status, user time, and a rename, and ignores a delta', () => {
		const start = noteCatalogEvent(null, { type: 'agent_start' }, false)
		assert.deepEqual(start.patch, { status: 'running' })
		assert.equal(start.pending, null)
		assert.equal(start.unseen, null)

		const user = noteCatalogEvent(
			null,
			{ type: 'message_end', message: { role: 'user', content: 'hi', timestamp: at } } as AgentSessionEvent,
			true,
		)
		assert.deepEqual(user.patch, { modified: new Date(at).toISOString() })

		const appended = noteCatalogEvent(
			null,
			{
				type: 'entry_appended',
				entry: { type: 'message', message: { role: 'user', content: 'hi', timestamp: at } },
			} as AgentSessionEvent,
			false,
		)
		assert.deepEqual(appended.patch, { modified: new Date(at).toISOString() })

		const renamed = noteCatalogEvent(null, { type: 'session_info_changed', name: undefined }, false)
		assert.deepEqual(renamed.patch, { name: '' })

		const delta = noteCatalogEvent('success', { type: 'thinking_level_changed', level: 'low' }, false)
		assert.equal(delta.patch, null)
		assert.equal(delta.pending, 'success')
		assert.equal(delta.unseen, undefined)
	})

	it('records success or failure only when the session is not being viewed', () => {
		const failed = noteCatalogEvent(
			null,
			{ type: 'agent_end', messages: [assistant('error')], willRetry: false } as AgentSessionEvent,
			false,
		)
		assert.equal(failed.pending, 'failure')
		const aborted = noteCatalogEvent(
			null,
			{ type: 'agent_end', messages: [assistant('aborted')], willRetry: false } as AgentSessionEvent,
			false,
		)
		assert.equal(aborted.pending, 'failure')
		const ok = noteCatalogEvent(
			null,
			{ type: 'agent_end', messages: [assistant('stop')], willRetry: false } as AgentSessionEvent,
			false,
		)
		assert.equal(ok.pending, 'success')

		const hidden = noteCatalogEvent(ok.pending, { type: 'agent_settled' }, false)
		assert.equal(hidden.unseen, 'success')
		assert.deepEqual(hidden.patch, { status: 'idle' })
		assert.equal(hidden.pending, null)

		const viewed = noteCatalogEvent('failure', { type: 'agent_settled' }, true)
		assert.equal(viewed.unseen, undefined)
		assert.equal(viewed.pending, null)
	})

	it('does not keep an outcome while the run will retry', () => {
		const retry = noteCatalogEvent(
			'failure',
			{ type: 'agent_end', messages: [assistant('error')], willRetry: true } as AgentSessionEvent,
			false,
		)
		assert.equal(retry.pending, null)
		const settled = noteCatalogEvent(retry.pending, { type: 'agent_settled' }, false)
		assert.equal(settled.unseen, undefined)
	})
})
