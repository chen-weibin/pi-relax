import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { projectAgentEvent } from './projectEvent.ts'

describe('project agent event', () => {
	it('reads blocks, the banner, and the catalog from one pass', () => {
		const start = projectAgentEvent({ type: 'agent_start' }, 'failure', false)
		assert.deepEqual(start.blocks, [{ type: 'run_start' }])
		assert.equal(start.assistantError, undefined)
		assert.deepEqual(start.catalog.patch, { status: 'running' })
		assert.equal(start.catalog.unseen, null)
		assert.equal(start.draft, 'keep')

		const message = { role: 'assistant' as const, timestamp: 5, content: [], errorMessage: '失败' }
		const failed = projectAgentEvent(
			{ type: 'message_end', message } as AgentSessionEvent,
			null,
			true,
		)
		assert.deepEqual(failed.blocks, [])
		assert.equal(failed.assistantError, '失败')
		assert.equal(failed.catalog.patch, null)

		const settled = projectAgentEvent({ type: 'agent_settled', aborted: false }, null, false)
		assert.deepEqual(settled.blocks, [{ type: 'run_end' }])
		assert.equal(settled.draft, 'clear')
		assert.deepEqual(settled.catalog.patch, { status: 'idle' })
	})
})