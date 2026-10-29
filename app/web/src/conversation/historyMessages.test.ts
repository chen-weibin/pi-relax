import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { historyToMessages } from './historyMessages.ts'

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
					{ type: 'thinking', text: '想一下' },
					{ type: 'text', text: '在' },
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

	it('skips system, tool results, and empty parts', () => {
		const messages = historyToMessages([
			{ role: 'system', content: '规则' },
			{ role: 'user', content: [{ type: 'text', text: '' }] },
			{ role: 'toolResult', toolName: 'read', content: [{ type: 'text', text: '文件' }], isError: false },
			{
				role: 'assistant',
				content: [
					{ type: 'thinking', thinking: '' },
					{ type: 'text', text: '好' },
				],
			},
		])
		assert.deepEqual(messages, [
			{ role: 'assistant', id: 'm3', parts: [{ type: 'text', text: '好' }] },
		])
	})

	it('uses error text when the assistant turn has no body', () => {
		const onlyError = historyToMessages([
			{ role: 'assistant', content: [{ type: 'toolCall', id: 'c', name: 'bash', arguments: {} }], errorMessage: '失败了' },
		])
		assert.deepEqual(onlyError, [
			{ role: 'assistant', id: 'm0', parts: [{ type: 'text', text: '失败了' }] },
		])
		const withBody = historyToMessages([
			{ role: 'assistant', content: [{ type: 'text', text: '有正文' }], errorMessage: '失败了' },
		])
		assert.deepEqual(withBody, [
			{ role: 'assistant', id: 'm0', parts: [{ type: 'text', text: '有正文' }] },
		])
	})
})
