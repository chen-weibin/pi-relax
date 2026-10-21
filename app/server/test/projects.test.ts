import assert from 'node:assert/strict'
import { mkdirSync, unlinkSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { join } from 'node:path'
import { createApp } from '../src/app.js'
import { relaxDb } from '../src/db/connection.js'
import { findSessionInfo } from '../src/sessions/index.js'
import { persistChat, removeHome, tempRelaxHome } from './home.js'

describe('projects and session catalog', () => {
	let home: string
	let base: string
	let server: Server
	let alpha: string
	let beta: string
	let alphaCwd: string
	let betaCwd: string

	before(async () => {
		home = tempRelaxHome()
		alpha = join(home, 'alpha')
		beta = join(home, 'beta')
		mkdirSync(alpha)
		mkdirSync(beta)
		const app = createApp()
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

	async function read(res: Response): Promise<any> {
		return res.json()
	}

	async function postProject(cwd: string, name?: string) {
		const res = await fetch(`${base}/api/projects`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(name === undefined ? { cwd } : { cwd, name }),
		})
		return { status: res.status, body: await read(res) }
	}

	it('puts a new project first and rejects a duplicate path', async () => {
		const first = await postProject(alpha)
		assert.equal(first.status, 201)
		assert.equal(first.body.name, 'alpha')
		alphaCwd = first.body.cwd
		const second = await postProject(beta, 'Beta')
		assert.equal(second.status, 201)
		betaCwd = second.body.cwd
		const listed = await fetch(`${base}/api/projects`)
		const page = await read(listed)
		assert.deepEqual(
			page.projects.map((item: { name: string }) => item.name),
			['Beta', 'alpha'],
		)
		assert.equal(page.total, 2)
		const again = await postProject(beta)
		assert.equal(again.status, 409)
		assert.equal(again.body.error.code, 'ALREADY_EXISTS')
	})

	it('rejects a missing directory', async () => {
		const res = await fetch(`${base}/api/projects`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ cwd: join(home, 'missing') }),
		})
		assert.equal(res.status, 400)
	})

	it('filters and counts by created time, and slices with offset', async () => {
		const all = await fetch(`${base}/api/projects/count`)
		assert.equal((await read(all)).count, 2)
		const future = new Date(Date.now() + 60_000).toISOString()
		const none = await fetch(`${base}/api/projects/count?createdFrom=${encodeURIComponent(future)}`)
		assert.equal((await read(none)).count, 0)
		const window = await fetch(`${base}/api/projects?offset=1&limit=1`)
		const page = await read(window)
		assert.equal(page.total, 2)
		assert.equal(page.projects.length, 1)
		assert.equal(page.projects[0].name, 'alpha')
	})

	it('moves by display index and renames', async () => {
		const listed = await read(await fetch(`${base}/api/projects`))
		const alphaId = listed.projects.find((item: { name: string }) => item.name === 'alpha').id
		const moved = await fetch(`${base}/api/projects/${alphaId}/move`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ index: 0 }),
		})
		assert.equal(moved.status, 200)
		const order = await read(await fetch(`${base}/api/projects`))
		assert.equal(order.projects[0].id, alphaId)
		const renamed = await fetch(`${base}/api/projects/${alphaId}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: 'Alpha' }),
		})
		assert.equal((await read(renamed)).name, 'Alpha')
		const empty = await fetch(`${base}/api/projects/${alphaId}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: '' }),
		})
		assert.equal(empty.status, 400)
	})

	it('soft-deletes the registration and keeps the session file', async () => {
		const listed = await read(await fetch(`${base}/api/projects`))
		const betaId = listed.projects.find((item: { cwd: string }) => item.cwd === betaCwd).id
		const manager = persistChat(betaCwd, 'keep me', 'still here')
		const removed = await fetch(`${base}/api/projects/${betaId}`, { method: 'DELETE' })
		assert.equal(removed.status, 204)
		assert.equal((await fetch(`${base}/api/projects/${betaId}`)).status, 404)
		const sessions = await read(await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}`))
		assert.equal(sessions.total, 1)
		assert.equal(sessions.sessions[0].id, manager.getSessionId())
		assert.equal(sessions.sessions[0].completed, false)
		const count = await fetch(`${base}/api/projects/${betaId}/sessions/count`)
		assert.equal((await read(count)).count, 1)
	})

	it('registers the same path again as the first row', async () => {
		const restored = await postProject(beta)
		assert.equal(restored.status, 201)
		const listed = await read(await fetch(`${base}/api/projects`))
		assert.equal(listed.projects[0].cwd, betaCwd)
	})

	it('marks a session completed and filters the list', async () => {
		const sessions = await read(await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}`))
		const id = sessions.sessions[0].id
		const marked = await fetch(`${base}/api/sessions/${id}/completed`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ completed: true }),
		})
		assert.equal(marked.status, 200)
		const done = await read(
			await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}&completed=true`),
		)
		assert.equal(done.total, 1)
		const open = await read(
			await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}&completed=false`),
		)
		assert.equal(open.total, 0)
		const cleared = await fetch(`${base}/api/sessions/${id}/completed`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ completed: false }),
		})
		assert.equal((await read(cleared)).completed, false)
		const unmarked = await read(
			await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}&completed=false`),
		)
		assert.equal(unmarked.total, 1)
	})

	it('drops the mark after the jsonl is deleted', async () => {
		const sessions = await read(await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}`))
		const id = sessions.sessions[0].id
		await fetch(`${base}/api/sessions/${id}/completed`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ completed: true }),
		})
		const info = await findSessionInfo(id)
		assert.ok(info)
		unlinkSync(info.path)
		const listed = await read(await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}`))
		assert.equal(listed.total, 0)
		const marks = relaxDb().prepare(`SELECT id FROM session_marks WHERE id = ?`).all(id)
		assert.equal(marks.length, 0)
	})

	it('purges completed sessions and sessions modified before a time', async () => {
		const early = persistChat(betaCwd, 'early', 'one')
		const later = persistChat(betaCwd, 'later', 'two')
		await fetch(`${base}/api/sessions/${early.getSessionId()}/completed`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ completed: true }),
		})
		const listed = await read(await fetch(`${base}/api/projects`))
		const betaId = listed.projects.find((item: { cwd: string }) => item.cwd === betaCwd).id
		const purged = await fetch(`${base}/api/projects/${betaId}/sessions/purge`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ completed: true }),
		})
		assert.equal((await read(purged)).deleted, 1)
		const left = await read(await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}`))
		assert.equal(left.sessions.length, 1)
		assert.equal(left.sessions[0].id, later.getSessionId())
		const future = new Date(Date.now() + 60_000).toISOString()
		const rest = await fetch(`${base}/api/projects/${betaId}/sessions/purge`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ modifiedBefore: future }),
		})
		assert.equal((await read(rest)).deleted, 1)
		const empty = await read(await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(betaCwd)}`))
		assert.equal(empty.total, 0)
	})

	it('purges the project row and its sessions', async () => {
		persistChat(alphaCwd, 'gone', 'away')
		const listed = await read(await fetch(`${base}/api/projects`))
		const alphaId = listed.projects.find((item: { cwd: string }) => item.cwd === alphaCwd).id
		const storageBefore = await read(await fetch(`${base}/api/sessions/storage`))
		assert.ok(storageBefore.files >= 1)
		assert.ok(storageBefore.bytes > 0)
		const purged = await fetch(`${base}/api/projects/${alphaId}/purge`, { method: 'POST' })
		assert.equal(purged.status, 204)
		assert.equal((await fetch(`${base}/api/projects/${alphaId}`)).status, 404)
		const sessions = await read(await fetch(`${base}/api/sessions?cwd=${encodeURIComponent(alphaCwd)}`))
		assert.equal(sessions.total, 0)
		const again = await postProject(alpha)
		assert.equal(again.status, 201)
		assert.notEqual(again.body.id, alphaId)
	})

	it('deletes a single session and its mark', async () => {
		const manager = persistChat(betaCwd, 'solo', 'bye')
		const id = manager.getSessionId()
		await fetch(`${base}/api/sessions/${id}/completed`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ completed: true }),
		})
		const removed = await fetch(`${base}/api/sessions/${id}`, { method: 'DELETE' })
		assert.equal(removed.status, 204)
		assert.equal((await fetch(`${base}/api/sessions/${id}`)).status, 404)
		const marks = relaxDb().prepare(`SELECT id FROM session_marks WHERE id = ?`).all(id)
		assert.equal(marks.length, 0)
	})
})
