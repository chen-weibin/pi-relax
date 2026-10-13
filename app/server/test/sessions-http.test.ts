import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { Agent } from '../src/agent/agent.js'
import type { RuntimeFactory } from '../src/agent/factory.js'
import { createApp } from '../src/app.js'
import { persistChat, removeHome, tempRelaxHome } from './home.js'
import { saveApiKey, writeDefault } from '../src/agent/models.js'

function fakeFactory(seen: { model?: string; persist?: boolean; switches: number } = { switches: 0 }): RuntimeFactory {
	return async ({ sessionManager, model }) => {
		if (model) seen.model = `${model.provider}/${model.id}`
		const listeners = new Set<(event: AgentSessionEvent) => void>()
		const session = {
			sessionManager,
			model: undefined as { provider: string; id: string } | undefined,
			get isStreaming() {
				return false
			},
			async prompt() {
				for (const listener of listeners) listener({ type: 'agent_start' })
			},
			getAvailableThinkingLevels() {
				return ['off', 'minimal', 'low', 'medium', 'high']
			},
			setThinkingLevel() {},
			async setModel(next: { provider: string; id: string }, options?: { persist?: boolean }) {
				session.model = next
				seen.model = `${next.provider}/${next.id}`
				seen.persist = options?.persist
				seen.switches += 1
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

describe('sessions http', () => {
	let home: string
	let base: string
	let server: Server
	let agent: Agent

	let seen: { model?: string; persist?: boolean; switches: number }

	before(async () => {
		home = tempRelaxHome()
		await saveApiKey('minimax', 'test-key')
		await writeDefault('minimax', 'MiniMax-M3')
		seen = { switches: 0 }
		agent = new Agent(fakeFactory(seen))
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

	it('POST /api/sessions starts a run', async () => {
		const res = await fetch(`${base}/api/sessions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'hello', cwd: homedir() }),
		})
		assert.equal(res.status, 202)
		const body = (await res.json()) as { id: string; status: string }
		assert.ok(body.id)
		assert.equal(body.status, 'running')
	})

	it('GET /api/sessions/:id/history uses session context', async () => {
		const manager = persistChat(homedir(), 'hist-q', 'hist-a')
		const res = await fetch(`${base}/api/sessions/${manager.getSessionId()}/history`)
		assert.equal(res.status, 200)
		const body = (await res.json()) as { messages: unknown[] }
		assert.ok(Array.isArray(body.messages))
		assert.ok(body.messages.length >= 2)
	})

	it('GET /api/sessions/events wraps events with sessionId', async () => {
		const ac = new AbortController()
		const stream = await fetch(`${base}/api/sessions/events`, { signal: ac.signal })
		assert.equal(stream.status, 200)
		assert.ok(stream.headers.get('content-type')?.includes('text/event-stream'))
		const create = await fetch(`${base}/api/sessions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'sse', cwd: homedir() }),
		})
		const created = (await create.json()) as { id: string }
		const reader = stream.body!.getReader()
		const decoder = new TextDecoder()
		let buf = ''
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			buf += decoder.decode(value, { stream: true })
			if (buf.includes('"sessionId"')) break
		}
		ac.abort()
		assert.ok(buf.includes(created.id))
		assert.ok(buf.includes('"type":"agent_start"'))
	})

	it('queues steer and rejects a bare second prompt', async () => {
		const created = await fetch(`${base}/api/sessions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'first', cwd: homedir() }),
		})
		const { id } = (await created.json()) as { id: string }
		const busy = await fetch(`${base}/api/sessions/${id}/prompt`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'again' }),
		})
		assert.equal(busy.status, 409)
		const steered = await fetch(`${base}/api/sessions/${id}/prompt`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'cut in', streamingBehavior: 'steer' }),
		})
		assert.equal(steered.status, 202)
		const bad = await fetch(`${base}/api/sessions/${id}/prompt`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'nope', streamingBehavior: 'now' }),
		})
		assert.equal(bad.status, 400)
	})

	it('sets a session name', async () => {
		const manager = persistChat(homedir(), 'named-q', 'named-a')
		const res = await fetch(`${base}/api/sessions/${manager.getSessionId()}/name`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: '计划标题' }),
		})
		assert.equal(res.status, 200)
		const body = (await res.json()) as { name?: string }
		assert.equal(body.name, '计划标题')
		const cleared = await fetch(`${base}/api/sessions/${manager.getSessionId()}/name`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: '' }),
		})
		assert.equal(cleared.status, 200)
		const clearedBody = (await cleared.json()) as { name?: string }
		assert.equal(clearedBody.name, undefined)
	})

	it('lists thinking levels for a registered model', async () => {
		const res = await fetch(
			`${base}/api/models/thinking-levels?provider=minimax&id=${encodeURIComponent('MiniMax-M3')}`,
		)
		assert.equal(res.status, 200)
		const body = (await res.json()) as {
			provider: string
			id: string
			defaultThinkingLevel: string
			thinkingLevels: string[]
		}
		assert.equal(body.provider, 'minimax')
		assert.equal(body.id, 'MiniMax-M3')
		assert.equal(body.defaultThinkingLevel, 'medium')
		assert.deepEqual(body.thinkingLevels, ['off', 'minimal', 'low', 'medium', 'high'])
		const missing = await fetch(`${base}/api/models/thinking-levels?provider=minimax&id=nope`)
		assert.equal(missing.status, 404)
		const bad = await fetch(`${base}/api/models/thinking-levels`)
		assert.equal(bad.status, 400)
	})

	it('rejects an unsupported thinking level before creating a session', async () => {
		const res = await fetch(`${base}/api/sessions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'hi', cwd: homedir(), thinkingLevel: 'xhigh' }),
		})
		assert.equal(res.status, 400)
		const body = (await res.json()) as { error: { code: string } }
		assert.equal(body.error.code, 'BAD_REQUEST')
	})

	it('stores a provider key and uses the default model for a new session', async () => {
		const saved = await fetch(`${base}/api/providers/minimax`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ apiKey: 'replaced-key' }),
		})
		assert.equal(saved.status, 200)
		const savedBody = (await saved.json()) as { configured: boolean; apiKey?: string }
		assert.equal(savedBody.configured, true)
		assert.equal(savedBody.apiKey, undefined)
		assert.equal(JSON.stringify(savedBody).includes('replaced-key'), false)
		const auth = JSON.parse(readFileSync(join(home, 'agent', 'auth.json'), 'utf8')) as {
			minimax: { type: string; key: string }
		}
		assert.equal(auth.minimax.type, 'api_key')
		assert.equal(auth.minimax.key, 'replaced-key')

		const models = await fetch(`${base}/api/models?provider=minimax`)
		assert.equal(models.status, 200)
		const listed = (await models.json()) as { available: boolean; models: Array<{ id: string }> }
		assert.equal(listed.available, true)
		assert.ok(listed.models.some((item) => item.id === 'MiniMax-M3'))

		const unknown = await fetch(`${base}/api/providers/azure`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ apiKey: 'nope' }),
		})
		assert.equal(unknown.status, 404)

		seen.model = undefined
		const created = await fetch(`${base}/api/sessions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'use default', cwd: homedir() }),
		})
		assert.equal(created.status, 202)
		assert.equal(seen.model, 'minimax/MiniMax-M3')

		const switchedDefault = await fetch(`${base}/api/sessions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				text: 'use other',
				cwd: homedir(),
				provider: 'minimax',
				model: 'MiniMax-M2.7',
			}),
		})
		assert.equal(switchedDefault.status, 202)
		assert.equal(seen.model, 'minimax/MiniMax-M2.7')
		const settings = JSON.parse(readFileSync(join(home, 'agent', 'settings.json'), 'utf8')) as {
			defaultProvider: string
			defaultModel: string
		}
		assert.equal(settings.defaultProvider, 'minimax')
		assert.equal(settings.defaultModel, 'MiniMax-M2.7')

		const manager = persistChat(homedir(), 'switch-q', 'switch-a')
		const beforeSwitch = seen.model
		const switchesBefore = seen.switches
		const switched = await fetch(`${base}/api/sessions/${manager.getSessionId()}/model`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ provider: 'minimax', model: 'MiniMax-M3' }),
		})
		assert.equal(switched.status, 200)
		assert.equal(seen.model, beforeSwitch)
		assert.equal(seen.switches, switchesBefore)
		const afterSwitch = JSON.parse(readFileSync(join(home, 'agent', 'settings.json'), 'utf8')) as {
			defaultModel: string
		}
		assert.equal(afterSwitch.defaultModel, 'MiniMax-M3')

		const sent = await fetch(`${base}/api/sessions/${manager.getSessionId()}/prompt`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'now', provider: 'minimax', model: 'MiniMax-M3' }),
		})
		assert.equal(sent.status, 202)
		assert.equal(seen.model, 'minimax/MiniMax-M3')
		assert.equal(seen.persist, undefined)
		assert.equal(seen.switches, switchesBefore + 1)

		await fetch(`${base}/api/sessions/${manager.getSessionId()}/abort`, { method: 'POST' })
		const again = await fetch(`${base}/api/sessions/${manager.getSessionId()}/prompt`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'same', provider: 'minimax', model: 'MiniMax-M3' }),
		})
		assert.equal(again.status, 202)
		assert.equal(seen.switches, switchesBefore + 1)
	})
})
