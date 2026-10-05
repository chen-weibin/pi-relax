import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { homedir } from 'node:os'
import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { Agent } from '../src/agent/agent.js'
import { BusyError } from '../src/utils/errors.js'
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
			async prompt() {
				running = true
				for (const listener of listeners) listener({ type: 'agent_start' })
				await wait()
				running = false
				for (const listener of listeners) {
					listener({ type: 'agent_end', messages: [], willRetry: false })
					listener({ type: 'agent_settled' })
				}
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

	it('loads history from SessionManager.buildSessionContext', async () => {
		const manager = persistChat(homedir(), 'q', 'a')
		const agent = new Agent(fakeFactory())
		const history = await agent.history(manager.getSessionId())
		assert.ok(history.messages.length >= 2)
	})
})
