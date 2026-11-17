import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { customProviderPayload, emptyProviderDraft, type CustomProviderDraft } from './customProviderForm.ts'

function validDraft(): CustomProviderDraft {
	return {
		...emptyProviderDraft('openai-completions'),
		id: 'ollama',
		baseUrl: 'http://localhost:11434/v1',
		apiKey: 'ollama',
		models: [{ id: 'gemma', name: '', reasoning: false, contextWindow: '', maxTokens: '' }],
	}
}

describe('customProviderPayload', () => {
	it('rejects an illegal id', () => {
		const result = customProviderPayload({ ...validDraft(), id: 'Ollama' }, 'create')
		assert.equal(result.ok, false)
	})

	it('rejects an empty model list', () => {
		const result = customProviderPayload({ ...validDraft(), models: [] }, 'create')
		assert.equal(result.ok, false)
	})

	it('omits a blank apiKey on update', () => {
		const result = customProviderPayload({ ...validDraft(), apiKey: '  ' }, 'update')
		assert.equal(result.ok, true)
		if (!result.ok) return
		assert.equal('apiKey' in result.body, false)
		assert.equal(result.body.models[0]?.id, 'gemma')
	})
})
