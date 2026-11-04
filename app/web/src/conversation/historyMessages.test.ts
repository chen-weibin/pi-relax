import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { historyAssistantError, historyToMessages } from './historyMessages.ts'

describe('history messages', () => {
	it('keeps user text, thinking, and assistant text', () => {
		const messages = historyToMessages([
			{ role: 'user', content: '你好' },
			{
				role: 'assistant',
				content: [
					{ type: 'thinking', thinking: '想一下' },
					{ type: 'text', text: '在' },
					{ type: 'toolCall', id: 'call', name: 'read', arguments: {} },
				],
			},
		])
		assert.deepEqual(messages, [
			{ role: 'user', id: 'm0', text: '你好' },
			{
				role: 'assistant',
				id: 'm1',
				parts: [
					{ type: 'thinking', text: '想一下', contentIndex: 0 },
					{ type: 'text', text: '在', contentIndex: 1 },
					{
						type: 'tool',
						contentIndex: 2,
						id: 'call',
						name: 'read',
						argumentsText: '',
						resultText: '',
						isError: false,
					},
				],
			},
		])
	})

	it('joins user text parts and leaves image out of the text', () => {
		const messages = historyToMessages([
			{
				role: 'user',
				content: [
					{ type: 'text', text: '看' },
					{ type: 'image', data: 'abc', mimeType: 'image/png' },
					{ type: 'text', text: '图' },
				],
			},
		])
		assert.deepEqual(messages, [{ role: 'user', id: 'm0', text: '看图' }])
	})

	it('skips system and empty parts, and keeps an orphan tool result', () => {
		const messages = historyToMessages([
			{ role: 'system', content: '规则' },
			{ role: 'user', content: [{ type: 'text', text: '' }] },
			{ role: 'toolResult', toolCallId: 'missing', toolName: 'read', content: [{ type: 'text', text: '文件' }], isError: false },
			{
				role: 'assistant',
				content: [
					{ type: 'thinking', thinking: '' },
					{ type: 'text', text: '好' },
				],
			},
		])
		assert.deepEqual(messages, [
			{
				role: 'assistant',
				id: 'm2',
				parts: [
					{
						type: 'tool',
						contentIndex: 0,
						id: 'missing',
						name: 'read',
						argumentsText: '',
						resultText: '文件',
						isError: false,
					},
				],
			},
			{ role: 'assistant', id: 'm3', parts: [{ type: 'text', text: '好', contentIndex: 1 }] },
		])
	})

	it('attaches a tool result onto the call and leaves errorMessage out of the text', () => {
		const messages = historyToMessages([
			{
				role: 'assistant',
				content: [{ type: 'toolCall', id: 'c', name: 'bash', arguments: { command: 'ls' } }],
				errorMessage: '失败了',
			},
			{ role: 'toolResult', toolCallId: 'c', toolName: 'bash', content: [{ type: 'text', text: 'a.ts' }], isError: true },
			{ role: 'assistant', content: [{ type: 'text', text: '有正文' }] },
		])
		assert.deepEqual(messages, [
			{
				role: 'assistant',
				id: 'm0',
				parts: [
					{
						type: 'tool',
						contentIndex: 0,
						id: 'c',
						name: 'bash',
						argumentsText: '{\n  "command": "ls"\n}',
						resultText: 'a.ts',
						isError: true,
					},
				],
			},
			{ role: 'assistant', id: 'm2', parts: [{ type: 'text', text: '有正文', contentIndex: 0 }] },
		])
		assert.equal(
			historyAssistantError([
				{ role: 'assistant', content: [], errorMessage: '失败了' },
				{ role: 'assistant', content: [{ type: 'text', text: '有正文' }] },
			]),
			null,
		)
		assert.equal(historyAssistantError([{ role: 'assistant', content: [], errorMessage: '失败了' }]), '失败了')
	})

	it('prefers a string id, then the timestamp', () => {
		const messages = historyToMessages([
			{ role: 'user', id: 'u1', timestamp: 1, content: '你好' },
			{ role: 'assistant', timestamp: 2, content: [{ type: 'text', text: '在' }] },
		])
		assert.equal(messages[0]?.id, 'u1')
		assert.equal(messages[1]?.id, 't2')
	})
})
