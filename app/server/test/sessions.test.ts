import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { defaultCwd, historyFrom, listSessions } from '../src/sessions/index.js'
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

	it('uses ~/.relax/workspace when no cwd is given', () => {
		const workspace = join(home, 'workspace')
		assert.equal(defaultCwd(), workspace)
		assert.equal(existsSync(workspace), true)
	})

	it('writes a file when the first user message exists', async () => {
		const before = await listSessions(cwd)
		const { createSessionManager } = await import('../src/sessions/index.js')
		const manager = createSessionManager(cwd)
		assert.equal(await listSessions(cwd).then((items) => items.length), before.length)
		manager.appendMessage({
			role: 'user',
			content: [{ type: 'text', text: 'only user' }],
			timestamp: Date.now(),
		})
		assert.equal(manager.getSessionFile()?.startsWith(home), true)
		const after = await listSessions(cwd)
		assert.equal(after.length, before.length + 1)
		assert.ok(after.some((item) => item.id === manager.getSessionId()))
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
