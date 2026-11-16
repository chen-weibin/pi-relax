import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { Agent } from '../src/agent/agent.js'
import type { RuntimeFactory } from '../src/agent/factory.js'
import { saveApiKey, writeDefault } from '../src/agent/models.js'
import { createApp } from '../src/app.js'
import { removeHome, tempRelaxHome } from './home.js'
import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { homedir } from 'node:os'

const OLLAMA_BODY = {
	id: 'ollama',
	name: 'Ollama',
	baseUrl: 'http://localhost:11434/v1',
	api: 'openai-completions',
	apiKey: 'ollama',
	models: [
		{
			id: 'gemma4:e4b',
			name: 'Gemma 4 E4B',
			reasoning: false,
			contextWindow: 131072,
			maxTokens: 8192,
		},
	],
}

function fakeFactory(): RuntimeFactory {
	return async ({ sessionManager, model }) => {
		const listeners = new Set<(event: AgentSessionEvent) => void>()
		const session = {
			sessionManager,
			model: model ? { provider: model.provider, id: model.id } : undefined,
			get isStreaming() {
				return false
			},
			async prompt(text?: string) {
				if (text) {
					const message = {
						role: 'user' as const,
						content: [{ type: 'text' as const, text }],
						timestamp: Date.now(),
					}
					sessionManager.appendMessage(message)
					for (const listener of listeners) listener({ type: 'message_end', message })
				}
				for (const listener of listeners) listener({ type: 'agent_start' })
			},
			getAvailableThinkingLevels() {
				return ['off', 'minimal', 'low', 'medium', 'high']
			},
			setThinkingLevel() {},
			async setModel(next: { provider: string; id: string }) {
				session.model = next
			},
			setSessionName(name: string) {
				sessionManager.appendSessionInfo(name)
			},
			clearQueue() {
				return { steering: [] as string[], followUp: [] as string[] }
			},
			async abort() {},
			subscribe(listener: (event: AgentSessionEvent) => void) {
				listeners.add(listener)
				return () => listeners.delete(listener)
			},
			dispose() {},
		}
		return { session: session as unknown as AgentSession }
	}
}

describe('custom providers http', () => {
	let home: string
	let base: string
	let server: Server

	before(async () => {
		home = tempRelaxHome()
		await saveApiKey('minimax', 'test-key')
		await writeDefault('minimax', 'MiniMax-M3')
		const agent = new Agent(fakeFactory())
		const app = createApp({ agent })
		server = app.listen(0, '127.0.0.1')
		await new Promise<void>((resolve) => server.once('listening', resolve))
		const address = server.address()
		if (!address || typeof address === 'string') throw new Error('expected TCP')
		base = `http://127.0.0.1:${(address as AddressInfo).port}`
	})

	after(async () => {
		await new Promise<void>((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve()))
		})
		removeHome(home)
	})

	it('GET /api/custom-providers/meta lists apis', async () => {
		const res = await fetch(`${base}/api/custom-providers/meta`)
		assert.equal(res.status, 200)
		const body = (await res.json()) as { apis: string[]; defaults: { api: string } }
		assert.ok(body.apis.includes('openai-completions'))
		assert.equal(body.defaults.api, 'openai-completions')
	})

	it('POST creates ollama-shaped provider without leaking apiKey', async () => {
		const res = await fetch(`${base}/api/custom-providers`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(OLLAMA_BODY),
		})
		assert.equal(res.status, 201)
		const body = (await res.json()) as { provider: Record<string, unknown> }
		assert.equal(body.provider.id, 'ollama')
		assert.equal(body.provider.apiKeySet, true)
		assert.equal(body.provider.apiKey, undefined)
		assert.ok(JSON.stringify(body).includes('gemma4:e4b'))
		assert.ok(!JSON.stringify(body).includes('"apiKey":"ollama"'))
	})

	it('rejects builtin id collision', async () => {
		const res = await fetch(`${base}/api/custom-providers`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ...OLLAMA_BODY, id: 'minimax' }),
		})
		assert.equal(res.status, 409)
	})

	it('lists custom in GET /api/providers with kind', async () => {
		const res = await fetch(`${base}/api/providers`)
		assert.equal(res.status, 200)
		const body = (await res.json()) as {
			providers: Array<{ id: string; kind: string; configured: boolean }>
		}
		const custom = body.providers.find((row) => row.id === 'ollama')
		assert.ok(custom)
		assert.equal(custom.kind, 'custom')
		assert.equal(custom.configured, true)
		const builtin = body.providers.find((row) => row.id === 'minimax')
		assert.ok(builtin)
		assert.equal(builtin.kind, 'builtin')
	})

	it('lists models and appears in available list', async () => {
		const catalog = await fetch(`${base}/api/providers/ollama/models`)
		assert.equal(catalog.status, 200)
		const catalogBody = (await catalog.json()) as { models: Array<{ id: string }> }
		assert.ok(catalogBody.models.some((model) => model.id === 'gemma4:e4b'))

		const available = await fetch(`${base}/api/models?provider=ollama`)
		assert.equal(available.status, 200)
		const availableBody = (await available.json()) as {
			available: boolean
			models: Array<{ id: string; provider: string }>
		}
		assert.equal(availableBody.available, true)
		assert.ok(availableBody.models.some((model) => model.provider === 'ollama' && model.id === 'gemma4:e4b'))
	})

	it('PUT keeps apiKey when omitted and can set default', async () => {
		const updated = await fetch(`${base}/api/custom-providers/ollama`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				name: 'Ollama Local',
				baseUrl: OLLAMA_BODY.baseUrl,
				api: OLLAMA_BODY.api,
				models: OLLAMA_BODY.models,
			}),
		})
		assert.equal(updated.status, 200)
		const updatedBody = (await updated.json()) as { provider: { name?: string; apiKeySet: boolean } }
		assert.equal(updatedBody.provider.name, 'Ollama Local')
		assert.equal(updatedBody.provider.apiKeySet, true)

		const def = await fetch(`${base}/api/models/default`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ provider: 'ollama', model: 'gemma4:e4b' }),
		})
		assert.equal(def.status, 200)
		const defBody = (await def.json()) as { model: { provider: string; id: string } }
		assert.equal(defBody.model.provider, 'ollama')
		assert.equal(defBody.model.id, 'gemma4:e4b')

		const read = await fetch(`${base}/api/models/default`)
		assert.equal(read.status, 200)
		const readBody = (await read.json()) as { model: { provider: string; id: string } }
		assert.equal(readBody.model.provider, 'ollama')
		assert.equal(readBody.model.id, 'gemma4:e4b')
	})

	it('POST /api/sessions can use custom provider+model', async () => {
		const res = await fetch(`${base}/api/sessions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				text: 'ping',
				cwd: homedir(),
				provider: 'ollama',
				model: 'gemma4:e4b',
			}),
		})
		assert.equal(res.status, 202)
	})

	it('DELETE removes custom provider from available list', async () => {
		const del = await fetch(`${base}/api/custom-providers/ollama`, { method: 'DELETE' })
		assert.equal(del.status, 204)

		const listed = await fetch(`${base}/api/custom-providers`)
		const listedBody = (await listed.json()) as { providers: Array<{ id: string }> }
		assert.ok(!listedBody.providers.some((row) => row.id === 'ollama'))

		const available = await fetch(`${base}/api/models?provider=ollama`)
		const availableBody = (await available.json()) as { available: boolean; models: unknown[] }
		assert.equal(availableBody.available, false)
		assert.equal(availableBody.models.length, 0)
	})

	it('builtin key API still rejects azure', async () => {
		const res = await fetch(`${base}/api/providers/azure`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ apiKey: 'x' }),
		})
		assert.equal(res.status, 404)
	})
})

describe('custom providers ollama smoke', () => {
	it('skips or hits local OpenAI-compatible /v1/models', async () => {
		let reachable = false
		try {
			const res = await fetch('http://127.0.0.1:11434/v1/models', {
				signal: AbortSignal.timeout(1500),
			})
			if (res.ok) {
				const body = (await res.json()) as { data?: Array<{ id: string }> }
				reachable = Boolean(body.data?.some((row) => row.id === 'gemma4:e4b'))
			}
		} catch {
			reachable = false
		}
		if (!reachable) {
			console.log('skip ollama smoke: gemma4:e4b not reachable')
			return
		}
		const chat = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer ollama',
			},
			body: JSON.stringify({
				model: 'gemma4:e4b',
				messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
				max_tokens: 8,
				stream: false,
			}),
			signal: AbortSignal.timeout(120_000),
		})
		assert.equal(chat.status, 200)
		const body = (await chat.json()) as { choices?: Array<{ message?: { content?: string } }> }
		assert.ok(body.choices?.[0]?.message?.content)
	})
})
