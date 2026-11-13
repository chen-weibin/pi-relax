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

	it('maps a tool call and its result, and ignores compaction', () => {
		const start = adaptAgentSession({
			type: 'message_update',
			message: assistant,
			assistantMessageEvent: {
				type: 'toolcall_end',
				contentIndex: 0,
				toolCall: { type: 'toolCall', id: 'call', name: 'read', arguments: { path: 'a.ts' } },
				partial: assistant,
			},
		} as AgentSessionEvent)
		assert.deepEqual(start, [
			{
				type: 'tool_end',
				messageId: 't5',
				contentIndex: 0,
				toolCallId: 'call',
				name: 'read',
				argumentsText: '{\n  "path": "a.ts"\n}',
			},
		])
		const result = adaptAgentSession({
			type: 'tool_execution_end',
			toolCallId: 'call',
			toolName: 'read',
			result: { content: [{ type: 'text', text: '文件' }] },
			isError: false,
		} as AgentSessionEvent)
		assert.deepEqual(result, [
			{ type: 'tool_result', toolCallId: 'call', name: 'read', resultText: '文件', isError: false, done: true },
		])
		const withDetails = adaptAgentSession({
			type: 'tool_execution_end',
			toolCallId: 'edit1',
			toolName: 'edit',
			result: {
				content: [{ type: 'text', text: 'ok' }],
				details: { patch: '--- a\n+++ b\n@@\n-a\n+b\n', firstChangedLine: 1 },
			},
			isError: false,
		} as AgentSessionEvent)
		assert.deepEqual(withDetails, [
			{
				type: 'tool_result',
				toolCallId: 'edit1',
				name: 'edit',
				resultText: 'ok',
				isError: false,
				done: true,
				details: { patch: '--- a\n+++ b\n@@\n-a\n+b\n', firstChangedLine: 1 },
			},
		])
		const fromMessage = adaptAgentSession({
			type: 'message_end',
			message: {
				role: 'toolResult',
				toolCallId: 'edit1',
				toolName: 'edit',
				content: [{ type: 'text', text: 'ok' }],
				details: { patch: 'p' },
				isError: false,
				timestamp: 1,
			},
		} as AgentSessionEvent)
		assert.deepEqual(fromMessage, [
			{
				type: 'tool_result',
				toolCallId: 'edit1',
				name: 'edit',
				resultText: 'ok',
				isError: false,
				done: true,
				details: { patch: 'p' },
			},
		])
		assert.deepEqual(adaptAgentSession({ type: 'agent_start' }), [{ type: 'run_start' }])
		assert.deepEqual(adaptAgentSession({ type: 'agent_settled', aborted: false }), [{ type: 'run_end' }])
		assert.deepEqual(adaptAgentSession({ type: 'agent_end', messages: [], willRetry: false }), [])
		assert.deepEqual(adaptAgentSession({ type: 'compaction_start', reason: 'manual' } as AgentSessionEvent), [])
	})
})
