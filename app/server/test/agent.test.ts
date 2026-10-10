import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { Agent } from '../src/agent/agent.js'
import { patchSettings } from '../src/config/settings.js'
import { BusyError, HttpError } from '../src/utils/errors.js'
import type { RuntimeFactory } from '../src/agent/factory.js'
import { persistChat, removeHome, tempRelaxHome } from './home.js'

function fakeFactory(): RuntimeFactory {
	return async ({ sessionManager }) => {
		const listeners = new Set<(event: AgentSessionEvent) => void>()
		let running = false
		let gate: (() => void) | undefined
		const wait = () =>
			new Promise<void>((resolve) => {
				gate = resolve
			})
		const session = {
			sessionManager,
			get isStreaming() {
				return running
			},
			async prompt(_text: string, options?: { streamingBehavior?: 'steer' | 'followUp' }) {
				if (options?.streamingBehavior) return
				running = true
				for (const listener of listeners) listener({ type: 'agent_start' })
				await wait()
				running = false
				for (const listener of listeners) {
					listener({ type: 'agent_end', messages: [], willRetry: false })
					listener({ type: 'agent_settled' })
				}
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
			async abort() {
				gate?.()
				running = false
			},
			subscribe(listener: (event: AgentSessionEvent) => void) {
				listeners.add(listener)
				return () => listeners.delete(listener)
			},
			dispose() {},
		}
		return { session: session as unknown as AgentSession }
	}
}

describe('agent', () => {
	let home: string

	before(() => {
		home = tempRelaxHome()
	})

	after(() => {
		removeHome(home)
	})

	it('rejects a second prompt while generating', async () => {
		const agent = new Agent(fakeFactory())
		const keep = agent.subscribe(() => {})
		const first = await agent.prompt({ text: 'hi', cwd: homedir() })
		await assert.rejects(() => agent.prompt({ text: 'again', sessionId: first.id }), BusyError)
		await agent.abort(first.id)
		keep()
	})

	it('queues steer while generating', async () => {
		const queued: string[] = []
		const agent = new Agent(async ({ sessionManager }) => {
			const listeners = new Set<(event: AgentSessionEvent) => void>()
			let running = false
			const session = {
				sessionManager,
				get isStreaming() {
					return running
				},
				async prompt(_text: string, options?: { streamingBehavior?: string }) {
					if (options?.streamingBehavior) {
						queued.push(options.streamingBehavior)
						return
					}
					running = true
					for (const listener of listeners) listener({ type: 'agent_start' })
				},
				getAvailableThinkingLevels() {
					return ['off', 'minimal', 'low', 'medium', 'high']
				},
				setThinkingLevel() {},
				subscribe(listener: (event: AgentSessionEvent) => void) {
					listeners.add(listener)
					return () => listeners.delete(listener)
				},
				dispose() {},
				clearQueue() {
					return { steering: [] as string[], followUp: [] as string[] }
				},
				async abort() {
					running = false
				},
			}
			return { session: session as unknown as AgentSession }
		})
		const keep = agent.subscribe(() => {})
		const first = await agent.prompt({ text: 'hi', cwd: homedir() })
		const queuedRun = await agent.prompt({
			text: 'now',
			sessionId: first.id,
			streamingBehavior: 'steer',
		})
		assert.equal(queuedRun.status, 'running')
		assert.deepEqual(queued, ['steer'])
		keep()
	})

	it('clears the queue before abort and returns the texts', async () => {
		const calls: string[] = []
		patchSettings({ abortPolicy: 'clear-then-abort' })
		const agent = new Agent(async ({ sessionManager }) => {
			const listeners = new Set<(event: AgentSessionEvent) => void>()
			const session = {
				sessionManager,
				get isStreaming() {
					return false
				},
				async prompt() {
					for (const listener of listeners) listener({ type: 'agent_start' })
				},
				clearQueue() {
					calls.push('clearQueue')
					return { steering: ['cut in'], followUp: ['later'] }
				},
				async abort() {
					calls.push('abort')
				},
				subscribe(listener: (event: AgentSessionEvent) => void) {
					listeners.add(listener)
					return () => listeners.delete(listener)
				},
				dispose() {},
			}
			return { session: session as unknown as AgentSession }
		})
		const keep = agent.subscribe(() => {})
		const cwd = mkdtempSync(join(tmpdir(), 'relax-cwd-'))
		const first = await agent.prompt({ text: 'hi', cwd })
		const stopped = await agent.abort(first.id)
		assert.deepEqual(calls, ['clearQueue', 'abort'])
		assert.deepEqual(stopped.cleared, { steering: ['cut in'], followUp: ['later'] })
		assert.equal(stopped.status, 'idle')
		keep()
	})

	it('abort-only stops the run and leaves the queue', async () => {
		const calls: string[] = []
		patchSettings({ abortPolicy: 'abort-only' })
		const agent = new Agent(async ({ sessionManager }) => {
			const listeners = new Set<(event: AgentSessionEvent) => void>()
			const session = {
				sessionManager,
				get isStreaming() {
					return false
				},
				async prompt() {
					for (const listener of listeners) listener({ type: 'agent_start' })
				},
				clearQueue() {
					calls.push('clearQueue')
					return { steering: ['cut in'], followUp: ['later'] }
				},
				async abort() {
					calls.push('abort')
				},
				subscribe(listener: (event: AgentSessionEvent) => void) {
					listeners.add(listener)
					return () => listeners.delete(listener)
				},
				dispose() {},
			}
			return { session: session as unknown as AgentSession }
		})
		const keep = agent.subscribe(() => {})
		const cwd = mkdtempSync(join(tmpdir(), 'relax-cwd-'))
		const first = await agent.prompt({ text: 'hi', cwd })
		const stopped = await agent.abort(first.id)
		assert.deepEqual(calls, ['abort'])
		assert.deepEqual(stopped.cleared, { steering: [], followUp: [] })
		keep()
	})

	it('stays running after agent_end until settled, and stays resident while subscribed', async () => {
		let disposed = 0
		let emit: ((event: AgentSessionEvent) => void) | undefined
		const agent = new Agent(async ({ sessionManager }) => {
			const listeners = new Set<(event: AgentSessionEvent) => void>()
			emit = (event) => {
				for (const listener of listeners) listener(event)
			}
			const session = {
				sessionManager,
				get isStreaming() {
					return false
				},
				async prompt() {
					emit?.({ type: 'agent_start' })
				},
				clearQueue() {
					return { steering: [] as string[], followUp: [] as string[] }
				},
				async abort() {},
				subscribe(listener: (event: AgentSessionEvent) => void) {
					listeners.add(listener)
					return () => listeners.delete(listener)
				},
				dispose() {
					disposed += 1
				},
			}
			return { session: session as unknown as AgentSession }
		})
		const manager = persistChat(homedir(), 'q', 'a')
		const id = manager.getSessionId()
		const keep = agent.subscribe(() => {})
		const started = await agent.prompt({ text: 'hi', sessionId: id })
		assert.equal(started.status, 'running')
		emit?.({ type: 'agent_end', messages: [], willRetry: false })
		assert.equal((await agent.get(id)).status, 'running')
		assert.equal(disposed, 0)
		emit?.({ type: 'agent_settled' })
		assert.equal((await agent.get(id)).status, 'idle')
		assert.equal(disposed, 0)
		keep()
		assert.equal(disposed, 1)
	})

	it('rejects a thinking level the default model does not support', async () => {
		const agent = new Agent(fakeFactory())
		await assert.rejects(
			() => agent.prompt({ text: 'hi', cwd: homedir(), thinkingLevel: 'xhigh' }),
			(error: unknown) => error instanceof HttpError && error.status === 400,
		)
	})

	it('loads history from SessionManager.buildSessionContext', async () => {
		const manager = persistChat(homedir(), 'q', 'a')
		const agent = new Agent(fakeFactory())
		const history = await agent.history(manager.getSessionId())
		assert.ok(history.messages.length >= 2)
	})
})
