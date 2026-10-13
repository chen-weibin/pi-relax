import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { redactProviderPayload } from '../src/extensions/providerRequestTrace.js'

describe('redactProviderPayload', () => {
	it('replaces configured secrets and langfuse key shapes inside the request body', () => {
		const payload = {
			model: 'MiniMax-M3',
			apiKey: 'sk-live',
			system: 'key sk-lf-abc-def stays out',
			messages: [{ role: 'user', content: 'token sk-test-secret' }],
		}
		const redacted = redactProviderPayload(payload, ['sk-test-secret']) as {
			model: string
			apiKey: string
			system: string
			messages: Array<{ content: string }>
		}
		assert.equal(redacted.system, 'key [redacted] stays out')
		assert.equal(redacted.messages[0]?.content, 'token [redacted]')
		assert.equal(redacted.apiKey, '[redacted]')
		assert.equal(redacted.model, 'MiniMax-M3')
	})
})