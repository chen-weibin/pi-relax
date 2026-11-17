import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.js'
import { avatarFilePath, readProfile } from '../src/profile/store.js'
import { removeHome, tempRelaxHome } from './home.js'

/** 1×1 PNG */
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
)

describe('profile store', () => {
	let home: string

	before(() => {
		home = tempRelaxHome()
	})

	after(() => {
		removeHome(home)
	})

	it('inserts defaults on first read', () => {
		assert.deepEqual(readProfile(), {
			displayName: 'chen',
			avatar: { mode: 'generated', shape: 'circle', expression: 'neutral', color: '#f4f4f1' },
		})
	})
})

describe('profile http', () => {
	let home: string
	let base: string
	let server: Server

	before(async () => {
		home = tempRelaxHome()
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

	it('GET /api/profile returns defaults', async () => {
		const res = await fetch(`${base}/api/profile`)
		assert.equal(res.status, 200)
		assert.deepEqual(await res.json(), {
			displayName: 'chen',
			avatar: { mode: 'generated', shape: 'circle', expression: 'neutral', color: '#f4f4f1' },
		})
	})

	it('PATCH updates displayName and generated avatar', async () => {
		const res = await fetch(`${base}/api/profile`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				displayName: 'Ada',
				avatar: { mode: 'generated', shape: 'blob', expression: 'happy', color: '#c4f0d8' },
			}),
		})
		assert.equal(res.status, 200)
		assert.deepEqual(await res.json(), {
			displayName: 'Ada',
			avatar: { mode: 'generated', shape: 'blob', expression: 'happy', color: '#c4f0d8' },
		})
	})

	it('rejects empty PATCH and unknown fields', async () => {
		const empty = await fetch(`${base}/api/profile`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: '{}',
		})
		assert.equal(empty.status, 400)
		const bad = await fetch(`${base}/api/profile`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ theme: 'dark' }),
		})
		assert.equal(bad.status, 400)
	})

	it('PUT/GET/DELETE custom avatar', async () => {
		const put = await fetch(`${base}/api/profile/avatar`, {
			method: 'PUT',
			headers: { 'content-type': 'image/png' },
			body: PNG,
		})
		assert.equal(put.status, 200)
		const putBody = (await put.json()) as { displayName: string; avatar: { mode: string; url: string } }
		assert.equal(putBody.displayName, 'Ada')
		assert.equal(putBody.avatar.mode, 'custom')
		assert.match(putBody.avatar.url, /^\/api\/profile\/avatar\?t=/)
		assert.ok(existsSync(avatarFilePath()))
		assert.deepEqual(readFileSync(avatarFilePath()), PNG)

		const get = await fetch(`${base}${putBody.avatar.url}`)
		assert.equal(get.status, 200)
		assert.equal(get.headers.get('content-type'), 'image/png')
		assert.deepEqual(Buffer.from(await get.arrayBuffer()), PNG)

		const del = await fetch(`${base}/api/profile/avatar`, { method: 'DELETE' })
		assert.equal(del.status, 200)
		assert.deepEqual(await del.json(), {
			displayName: 'Ada',
			avatar: { mode: 'generated', shape: 'blob', expression: 'happy', color: '#c4f0d8' },
		})
		assert.equal(existsSync(avatarFilePath()), false)
		assert.equal(existsSync(join(home, 'profile', 'avatar')), false)

		const missing = await fetch(`${base}/api/profile/avatar`)
		assert.equal(missing.status, 404)
	})

	it('rejects non-image PUT body', async () => {
		const res = await fetch(`${base}/api/profile/avatar`, {
			method: 'PUT',
			headers: { 'content-type': 'image/png' },
			body: Buffer.from('not-an-image'),
		})
		assert.equal(res.status, 400)
	})
})
