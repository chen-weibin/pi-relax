import assert from 'node:assert/strict'
import { existsSync, mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { after, before, describe, it } from 'node:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { closeRelaxDb, relaxDb } from '../src/db/connection.js'
import { defaultCwd, historyById, historyFrom, listSessions } from '../src/sessions/index.js'
import { insertSession } from '../src/sessions/rows.js'
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

	it('reads cold history from the stored path and ignores a missing file', async () => {
		const manager = persistChat(cwd, 'cold', 'reply')
		const path = manager.getSessionFile()
		assert.ok(path)
		const id = manager.getSessionId()
		const now = new Date().toISOString()
		insertSession({ id, cwd, path, name: 'cold', created: now, modified: now, completed: false })
		const history = await historyById(id)
		assert.ok(history?.messages.some((message) => (message as { role: string }).role === 'user'))
		relaxDb().prepare(`UPDATE sessions SET path = ? WHERE id = ?`).run(join(home, 'missing.jsonl'), id)
		assert.equal(await historyById(id), undefined)
	})
})

describe('sessions name column', () => {
	let home: string

	before(() => {
		home = tempRelaxHome()
	})

	after(() => {
		removeHome(home)
	})

	it('allows a null name when an older table required one', () => {
		closeRelaxDb()
		mkdirSync(join(home, 'sqlite'), { recursive: true })
		const created = new DatabaseSync(join(home, 'sqlite', 'relax.sqlite'))
		created.exec(`
			CREATE TABLE sessions (
				id TEXT PRIMARY KEY,
				cwd TEXT NOT NULL,
				path TEXT NOT NULL,
				name TEXT NOT NULL DEFAULT '',
				created TEXT NOT NULL,
				modified TEXT NOT NULL,
				completed INTEGER NOT NULL DEFAULT 0,
				deleted_at TEXT
			);
		`)
		created.close()
		const opened = relaxDb()
		opened
			.prepare(
				`INSERT INTO sessions (id, cwd, path, name, created, modified) VALUES ('a', '/c', '/c/a.jsonl', NULL, 't', 't')`,
			)
			.run()
		const row = opened.prepare(`SELECT name FROM sessions WHERE id = 'a'`).get() as { name: string | null }
		assert.equal(row.name, null)
	})
})
