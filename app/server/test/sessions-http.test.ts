import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { homedir } from 'node:os'
import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { Agent } from '../src/agent/agent.js'
import type { RuntimeFactory } from '../src/agent/factory.js'
import { createApp } from '../src/app.js'
import { persistChat, removeHome, tempRelaxHome } from './home.js'

function fakeFactory(): RuntimeFactory {
	return async ({ sessionManager }) => {
		const listeners = new Set<(event: AgentSessionEvent) => void>()
		const session = {
			sessionManager,
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

	before(async () => {
		home = tempRelaxHome()
		agent = new Agent(fakeFactory())
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
})
