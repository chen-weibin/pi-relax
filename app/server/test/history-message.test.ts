import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SessionHistory } from '../src/sessions/types.js'
import { withStreamingMessage } from '../src/sessions/history.js'

type Message = SessionHistory['messages'][number]

function history(messages: SessionHistory['messages']): SessionHistory {
	return { messages, thinkingLevel: 'medium', model: null }
}

describe('streaming message on history', () => {
	it('appends the in-flight message and skips the same role and timestamp', () => {
		const saved = history([{ role: 'user', content: 'hi', timestamp: 1 }])
		assert.equal(withStreamingMessage(saved, undefined), saved)

		const partial = { role: 'assistant', timestamp: 2 } as Message
		const next = withStreamingMessage(saved, partial)
		assert.equal(next.messages.at(-1), partial)
		assert.equal(next.messages.length, 2)

		assert.equal(withStreamingMessage(next, partial), next)
		const duplicate = { role: 'user', content: 'other', timestamp: 1 } as Message
		assert.equal(withStreamingMessage(saved, duplicate), saved)
	})
})
