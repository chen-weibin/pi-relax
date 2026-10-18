import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtemp, writeFile } from 'node:fs/promises'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.js'
import { serverConfig } from '../src/config/server.js'
import { attachFs, closeFsWatchers } from '../src/fs/watch.js'

describe('fs http', () => {
	let dir: string
	let base: string
	let server: Server

	before(async () => {
		dir = mkdtempSync(join(tmpdir(), 'relax-fs-'))
		const app = createApp()
		server = app.listen(0, '127.0.0.1')
		await new Promise<void>((resolve) => server.once('listening', resolve))
		attachFs(server)
		const address = server.address()
		if (!address || typeof address === 'string') throw new Error('expected TCP')
		base = `http://127.0.0.1:${(address as AddressInfo).port}`
	})

	after(async () => {
		await closeFsWatchers()
		await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
		rmSync(dir, { recursive: true, force: true })
	})

	function url(path: string, query: Record<string, string>) {
		const u = new URL(path, base)
		for (const [key, value] of Object.entries(query)) u.searchParams.set(key, value)
		return u
	}

	async function json(path: string, query: Record<string, string> = {}) {
		const response = await fetch(url(path, query))
		const body = (await response.json()) as { error?: { code: string; message: string } }
		return { status: response.status, body }
	}

	it('缺 path、相对路径和 ~ 都是 400，不存在是 404', async () => {
		const missing = await json('/api/fs/list')
		assert.equal(missing.status, 400)
		assert.match(missing.body.error?.message ?? '', /绝对路径/)

		const relative = await json('/api/fs/list', { path: 'rel' })
		assert.equal(relative.status, 400)

		const home = await json('/api/fs/stat', { path: '~/.relax/workspace' })
		assert.equal(home.status, 400)
		assert.match(home.body.error?.message ?? '', /~/)

		const gone = await json('/api/fs/read', { path: join(dir, 'nope') })
		assert.equal(gone.status, 404)
		assert.match(gone.body.error?.message ?? '', /不存在/)
	})

	it('列表带大小，文本和二进制按原文读写', async () => {
		const folder = join(dir, '子 目录')
		const textFile = join(folder, 'a.txt')
		const binFile = join(folder, 'b.bin')
		await fetch(url('/api/fs/dir', {}), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path: folder, recursive: true }),
		})
		const putText = await fetch(url('/api/fs/file', { path: textFile }), {
			method: 'PUT',
			headers: { 'X-Relax-Transfer': 'text' },
			body: '你好',
		})
		assert.equal(putText.status, 204)
		const putBin = await fetch(url('/api/fs/file', { path: binFile }), {
			method: 'PUT',
			headers: { 'X-Relax-Transfer': 'binary' },
			body: Buffer.from([0, 1, 255]),
		})
		assert.equal(putBin.status, 204)

		const listed = await json('/api/fs/list', { path: folder })
		assert.equal(listed.status, 200)
		const entries = (listed.body as { entries: { name: string; size: number; kind: string }[] }).entries
		assert.equal(entries.find((entry) => entry.name === 'a.txt')?.size, Buffer.byteLength('你好'))
		assert.equal(entries.find((entry) => entry.name === 'b.bin')?.kind, 'file')

		const text = await fetch(url('/api/fs/read', { path: textFile }))
		assert.equal(text.headers.get('x-relax-transfer'), 'text')
		assert.equal(await text.text(), '你好')

		const bin = await fetch(url('/api/fs/read', { path: binFile }))
		assert.equal(bin.headers.get('x-relax-transfer'), 'binary')
		assert.deepEqual(Buffer.from(await bin.arrayBuffer()), Buffer.from([0, 1, 255]))

		const noHeader = await fetch(url('/api/fs/file', { path: textFile }), { method: 'PUT', body: 'x' })
		assert.equal(noHeader.status, 400)
		assert.match(((await noHeader.json()) as { error: { message: string } }).error.message, /X-Relax-Transfer/)
	})

	it('非法 text 和超限写入留下原文件，整文件流式读不受上限', async () => {
		const file = join(dir, 'keep.txt')
		writeFileSync(file, 'hello')
		const savedMaxBytes = serverConfig.fs.maxBytes
		serverConfig.fs.maxBytes = 4
		try {
			const bad = await fetch(url('/api/fs/file', { path: file }), {
				method: 'PUT',
				headers: { 'X-Relax-Transfer': 'text' },
				body: Buffer.from([0xff, 0xfe]),
			})
			assert.equal(bad.status, 400)
			assert.equal(readFileSync(file, 'utf8'), 'hello')

			const huge = await fetch(url('/api/fs/file', { path: file }), {
				method: 'PUT',
				headers: { 'X-Relax-Transfer': 'binary' },
				body: 'hello world',
			})
			const hugeBody = (await huge.json()) as { error: { code: string; message: string } }
			assert.equal(huge.status, 413)
			assert.equal(hugeBody.error.code, 'PAYLOAD_TOO_LARGE')
			assert.match(hugeBody.error.message, /4/)
			assert.equal(readFileSync(file, 'utf8'), 'hello')

			const streamed = await fetch(url('/api/fs/read', { path: file }))
			assert.equal(await streamed.text(), 'hello')

			const slice = await fetch(url('/api/fs/read', { path: file, offset: '0', length: '5' }))
			assert.equal(slice.status, 413)

			const openRange = await fetch(url('/api/fs/read', { path: file }), { headers: { Range: 'bytes=0-' } })
			assert.equal(openRange.status, 413)
		} finally {
			serverConfig.fs.maxBytes = savedMaxBytes
		}
	})

	it('offset 与 Range 读同一段，同时给则 400，越过末尾则 416', async () => {
		const file = join(dir, 'range.txt')
		writeFileSync(file, 'abcdefghij')
		const byQuery = await fetch(url('/api/fs/read', { path: file, offset: '2', length: '3' }))
		assert.equal(byQuery.status, 206)
		assert.equal(byQuery.headers.get('content-range'), 'bytes 2-4/10')
		assert.equal(await byQuery.text(), 'cde')

		const byRange = await fetch(url('/api/fs/read', { path: file }), { headers: { Range: 'bytes=2-4' } })
		assert.equal(await byRange.text(), 'cde')

		const both = await fetch(url('/api/fs/read', { path: file, offset: '2', length: '3' }), {
			headers: { Range: 'bytes=2-4' },
		})
		assert.equal(both.status, 400)

		const past = await fetch(url('/api/fs/read', { path: file, offset: '20', length: '1' }))
		const pastBody = (await past.json()) as { error: { code: string; message: string } }
		assert.equal(past.status, 416)
		assert.equal(pastBody.error.code, 'RANGE_NOT_SATISFIABLE')
		assert.match(pastBody.error.message, /10/)
	})

	it('按 offset 分段写入，覆盖已写段，拒绝空洞和 text', async () => {
		const file = join(dir, 'parts.bin')
		const put = (offset: string | undefined, body: string, transfer = 'binary') =>
			fetch(url('/api/fs/file', offset === undefined ? { path: file } : { path: file, offset }), {
				method: 'PUT',
				headers: { 'X-Relax-Transfer': transfer },
				body,
			})
		assert.equal((await put('0', 'ab')).status, 204)
		assert.equal((await put('2', 'cd')).status, 204)
		assert.equal(readFileSync(file, 'utf8'), 'abcd')
		assert.equal((await put('1', 'Z')).status, 204)
		assert.equal(readFileSync(file, 'utf8'), 'aZcd')
		const hole = await put('10', 'x')
		assert.equal(hole.status, 400)
		assert.match(((await hole.json()) as { error: { message: string } }).error.message, /空洞/)
		const asText = await put('4', 'e', 'text')
		assert.equal(asText.status, 400)
		assert.match(((await asText.json()) as { error: { message: string } }).error.message, /binary/)
	})

	it('递归建父目录，空目录才能删，recursive 才能删非空目录', async () => {
		const nested = join(dir, 'nest', 'deep', 'f.txt')
		const created = await fetch(url('/api/fs/file', { path: nested, recursive: 'true' }), {
			method: 'PUT',
			headers: { 'X-Relax-Transfer': 'text' },
			body: 'z',
		})
		assert.equal(created.status, 204)
		const folder = join(dir, 'nest')
		const blocked = await fetch(url('/api/fs/dir', { path: folder }), { method: 'DELETE' })
		assert.equal(blocked.status, 400)
		assert.match(((await blocked.json()) as { error: { message: string } }).error.message, /非空/)
		const fileAsDir = await fetch(url('/api/fs/dir', { path: nested }), { method: 'DELETE' })
		assert.equal(fileAsDir.status, 400)
		const dirAsFile = await fetch(url('/api/fs/file', { path: folder }), { method: 'DELETE' })
		assert.equal(dirAsFile.status, 400)
		const removed = await fetch(url('/api/fs/dir', { path: folder, recursive: 'true' }), { method: 'DELETE' })
		assert.equal(removed.status, 204)
	})

	it('订阅根目录后能收到变更，超过路数则报错', async () => {
		const savedDebounce = serverConfig.fs.watchDebounceMs
		const savedWatchMax = serverConfig.fs.watchMax
		serverConfig.fs.watchDebounceMs = 40
		serverConfig.fs.watchMax = 1
		try {
			const root = await mkdtemp(join(dir, 'watch-'))
			const other = await mkdtemp(join(dir, 'watch-'))
			const messages: { type: string; path?: string; changes?: { path: string }[]; error?: { message: string } }[] = []
			const ws = new WebSocket(base.replace('http', 'ws') + '/ws/fs')
			ws.addEventListener('message', (event) => {
				const data = typeof event.data === 'string' ? event.data : String(event.data)
				messages.push(JSON.parse(data) as (typeof messages)[number])
			})
			await new Promise<void>((resolve, reject) => {
				ws.addEventListener('open', () => resolve())
				ws.addEventListener('error', () => reject(new Error('ws failed')))
			})
			ws.send(JSON.stringify({ type: 'watch', path: root }))
			await waitFor(() => messages.some((message) => message.type === 'watching'))
			const file = join(root, 'n.txt')
			await writeFile(file, 'n')
			await waitFor(() => messages.some((message) => message.changes?.some((change) => change.path === file)))
			ws.send(JSON.stringify({ type: 'watch', path: other }))
			await waitFor(() => messages.some((message) => message.type === 'error' && message.path === other))
			assert.match(messages.find((message) => message.type === 'error')?.error?.message ?? '', /上限/)
			ws.close()
		} finally {
			serverConfig.fs.watchDebounceMs = savedDebounce
			serverConfig.fs.watchMax = savedWatchMax
			await closeFsWatchers()
		}
	})
})

async function waitFor(pred: () => boolean) {
	const start = Date.now()
	while (!pred()) {
		if (Date.now() - start > 4000) throw new Error('timed out')
		await new Promise((resolve) => setTimeout(resolve, 40))
	}
}
