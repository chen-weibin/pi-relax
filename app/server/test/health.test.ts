import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.js'

describe('http', () => {
	let base: string
	let server: Server

	before(async () => {
		const app = createApp()
		server = app.listen(0, '127.0.0.1')
		await new Promise<void>((resolve) => server.once('listening', resolve))
		const address = server.address()
		if (!address || typeof address === 'string') {
			throw new Error('expected a TCP address')
		}
		base = `http://127.0.0.1:${(address as AddressInfo).port}`
	})

	after(async () => {
		await new Promise<void>((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve()))
		})
	})

	it('GET /health', async () => {
		const res = await fetch(`${base}/health`)
		assert.equal(res.status, 200)
		assert.deepEqual(await res.json(), { status: 'ok' })
	})

	it('unknown route', async () => {
		const res = await fetch(`${base}/missing`)
		assert.equal(res.status, 404)
		assert.deepEqual(await res.json(), {
			error: { code: 'NOT_FOUND', message: 'Not found' },
		})
	})

	it('bad json', async () => {
		const res = await fetch(`${base}/health`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{',
		})
		assert.equal(res.status, 400)
		assert.deepEqual(await res.json(), {
			error: { code: 'BAD_REQUEST', message: 'Invalid JSON' },
		})
	})

	it('preflight allows any origin', async () => {
		const res = await fetch(`${base}/health`, {
			method: 'OPTIONS',
			headers: {
				origin: 'http://localhost:5173',
				'access-control-request-method': 'GET',
			},
		})
		assert.equal(res.status, 204)
		assert.equal(res.headers.get('access-control-allow-origin'), '*')
	})
})
