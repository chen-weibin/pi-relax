import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { Agent } from '../src/agent/agent.js'
import type { RuntimeFactory } from '../src/agent/factory.js'
import { createApp } from '../src/app.js'
import { abortPolicyFor, patchSettings, readGlobalSettings, settingsPath } from '../src/config/settings.js'
import { saveApiKey, writeDefault } from '../src/agent/models.js'
import { removeHome, tempRelaxHome } from './home.js'

describe('settings store', () => {
	let home: string

	before(() => {
		home = tempRelaxHome()
	})

	after(() => {
		removeHome(home)
	})

	it('returns defaults when the file is missing', () => {
		assert.deepEqual(readGlobalSettings(), {
			steeringMode: 'one-at-a-time',
			followUpMode: 'one-at-a-time',
			abortPolicy: 'clear-then-abort',
		})
	})

	it('writes queue modes and abort policy without dropping other keys', () => {
		writeFileSync(settingsPath(), `${JSON.stringify({ theme: 'dark', relax: { keep: true } }, null, 2)}\n`)
		const saved = patchSettings({
			steeringMode: 'all',
			followUpMode: 'one-at-a-time',
			abortPolicy: 'abort-only',
		})
		assert.deepEqual(saved, {
			steeringMode: 'all',
			followUpMode: 'one-at-a-time',
			abortPolicy: 'abort-only',
		})
		const file = JSON.parse(readFileSync(settingsPath(), 'utf8')) as {
			theme: string
			steeringMode: string
			relax: { keep: boolean; abortPolicy: string }
		}
		assert.equal(file.theme, 'dark')
		assert.equal(file.steeringMode, 'all')
		assert.equal(file.relax.keep, true)
		assert.equal(file.relax.abortPolicy, 'abort-only')
	})

	it('lets the project .pi/settings.json override abort policy', () => {
		patchSettings({ abortPolicy: 'clear-then-abort' })
		const cwd = mkdtempSync(join(tmpdir(), 'relax-cwd-'))
		mkdirSync(join(cwd, '.pi'), { recursive: true })
		writeFileSync(join(cwd, '.pi', 'settings.json'), `${JSON.stringify({ relax: { abortPolicy: 'abort-only' } })}\n`)
		assert.equal(abortPolicyFor(cwd), 'abort-only')
		assert.equal(readGlobalSettings().abortPolicy, 'clear-then-abort')
	})
})

describe('settings http', () => {
	let home: string
	let base: string
	let server: Server
	let modes: { steering?: string; followUp?: string }

	before(async () => {
		home = tempRelaxHome()
		await saveApiKey('minimax', 'test-key')
		await writeDefault('minimax', 'MiniMax-M3')
		modes = {}
		const factory: RuntimeFactory = async ({ sessionManager }) => {
			const listeners = new Set<(event: AgentSessionEvent) => void>()
			const session = {
				sessionManager,
				get isStreaming() {
					return false
				},
				async prompt() {
					for (const listener of listeners) listener({ type: 'agent_start' })
				},
				setSteeringMode(mode: string) {
					modes.steering = mode
				},
				setFollowUpMode(mode: string) {
					modes.followUp = mode
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
		const app = createApp({ agent: new Agent(factory) })
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

	it('GET /api/settings returns defaults', async () => {
		const res = await fetch(`${base}/api/settings`)
		assert.equal(res.status, 200)
		assert.deepEqual(await res.json(), {
			steeringMode: 'one-at-a-time',
			followUpMode: 'one-at-a-time',
			abortPolicy: 'clear-then-abort',
		})
	})

	it('PATCH applies queue modes to a hot session', async () => {
		const created = await fetch(`${base}/api/sessions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'hello', cwd: tmpdir() }),
		})
		assert.equal(created.status, 202)
		const res = await fetch(`${base}/api/settings`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ steeringMode: 'all', followUpMode: 'all' }),
		})
		assert.equal(res.status, 200)
		assert.equal(modes.steering, 'all')
		assert.equal(modes.followUp, 'all')
		const body = (await res.json()) as { steeringMode: string; abortPolicy: string }
		assert.equal(body.steeringMode, 'all')
		assert.equal(body.abortPolicy, 'clear-then-abort')
	})

	it('rejects an empty body and an unknown mode', async () => {
		const empty = await fetch(`${base}/api/settings`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: '{}',
		})
		assert.equal(empty.status, 400)
		const bad = await fetch(`${base}/api/settings`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ abortPolicy: 'keep' }),
		})
		assert.equal(bad.status, 400)
	})
})
