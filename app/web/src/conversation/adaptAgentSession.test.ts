import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { adaptAgentSession } from './adaptAgentSession.ts'

const assistant = { role: 'assistant' as const, timestamp: 5, content: [] }

describe('adapt agent session', () => {
	it('maps a user message and text deltas onto the feed', () => {
		const user = adaptAgentSession({
			type: 'message_end',
			message: { role: 'user', id: 'u1', content: '你好', timestamp: 1 },
		} as AgentSessionEvent)
		assert.deepEqual(user, [{ type: 'user', messageId: 'u1', text: '你好' }])

		const delta = adaptAgentSession({
			type: 'message_update',
			message: assistant,
			assistantMessageEvent: { type: 'text_delta', contentIndex: 1, delta: '啊', partial: assistant },
		} as AgentSessionEvent)
		assert.deepEqual(delta, [{ type: 'text_delta', messageId: 't5', contentIndex: 1, delta: '啊' }])
	})

	it('drops tool calls and closes the run when the agent settles', () => {
		const tool = adaptAgentSession({
			type: 'message_update',
			message: assistant,
			assistantMessageEvent: { type: 'toolcall_delta', contentIndex: 0, delta: '{', partial: assistant },
		} as AgentSessionEvent)
		assert.deepEqual(tool, [])
		assert.deepEqual(adaptAgentSession({ type: 'agent_start' }), [{ type: 'run_start' }])
		assert.deepEqual(adaptAgentSession({ type: 'agent_settled' }), [{ type: 'run_end' }])
		assert.deepEqual(adaptAgentSession({ type: 'agent_end', messages: [], willRetry: false }), [])
	})
})
