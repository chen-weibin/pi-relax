import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { homedir } from 'node:os'
import { historyFrom, listSessions } from '../src/sessions/index.js'
import { persistChat, removeHome, tempRelaxHome } from './home.js'

describe('sessions files', () => {
	let home: string
	const cwd = homedir()

	before(() => {
		home = tempRelaxHome()
	})

	after(() => {
		removeHome(home)
	})

	it('does not write a file until an assistant message exists', async () => {
		const before = await listSessions(cwd)
		const { createSessionManager } = await import('../src/sessions/index.js')
		const manager = createSessionManager(cwd)
		manager.appendMessage({
			role: 'user',
			content: [{ type: 'text', text: 'only user' }],
			timestamp: Date.now(),
		})
		assert.equal(manager.getSessionFile()?.startsWith(home), true)
		const after = await listSessions(cwd)
		assert.equal(after.length, before.length)
	})

	it('lists persisted sessions and history via buildSessionContext', async () => {
		const manager = persistChat(cwd, 'hello', 'world')
		const listed = await listSessions(cwd)
		assert.ok(listed.some((item) => item.id === manager.getSessionId()))
		const history = historyFrom(manager)
		assert.equal(history.messages.length >= 2, true)
		const roles = history.messages.map((message) => (message as { role: string }).role)
		assert.ok(roles.includes('user'))
		assert.ok(roles.includes('assistant'))
	})
})
