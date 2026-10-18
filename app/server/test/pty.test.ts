import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { WebSocket, type RawData } from 'ws'
import { createApp } from '../src/app.js'
import { serverConfig } from '../src/config/server.js'
import { attachFs, closeFsWatchers } from '../src/fs/watch.js'
import { attachPty } from '../src/pty/attach.js'
import { closeAllPty } from '../src/pty/sessions.js'

describe('pty ws', { concurrency: 1 }, () => {
	let dir: string
	let zdot: string
	let base: string
	let server: Server
	const saved = {
		ptyGraceMs: serverConfig.ptyGraceMs,
		ptyMax: serverConfig.ptyMax,
		zdot: process.env.ZDOTDIR,
	}

	before(async () => {
		dir = mkdtempSync(join(tmpdir(), 'relax-pty-'))
		zdot = mkdtempSync(join(tmpdir(), 'relax-pty-zdot-'))
		for (const name of ['.zshenv', '.zprofile', '.zshrc', '.zlogin']) writeFileSync(join(zdot, name), '')
		process.env.ZDOTDIR = zdot
		mkdirSync(join(dir, '子 目录'))
		const app = createApp()
		server = app.listen(0, '127.0.0.1')
		await new Promise<void>((resolve) => server.once('listening', resolve))
		attachFs(server)
		attachPty(server)
		const address = server.address()
		if (!address || typeof address === 'string') throw new Error('expected TCP')
		base = `ws://127.0.0.1:${(address as AddressInfo).port}`
	})

	after(async () => {
		closeAllPty()
		await closeFsWatchers()
		serverConfig.ptyGraceMs = saved.ptyGraceMs
		serverConfig.ptyMax = saved.ptyMax
		if (saved.zdot === undefined) delete process.env.ZDOTDIR
		else process.env.ZDOTDIR = saved.zdot
		await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
		rmSync(dir, { recursive: true, force: true })
		rmSync(zdot, { recursive: true, force: true })
	})

	function connect(query: Record<string, string>) {
		const url = new URL('/ws/pty', base)
		for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
		return new WebSocket(url)
	}

	function closed(ws: WebSocket) {
		return new Promise<{ code: number; reason: string }>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('close timeout')), 5000)
			ws.once('close', (code, reason) => {
				clearTimeout(timer)
				resolve({ code, reason: reason.toString('utf8') })
			})
			ws.once('error', () => {})
		})
	}

	async function ready(ws: WebSocket): Promise<{ id: string; replay?: string }> {
		const message = await new Promise<RawData>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('ready timeout')), 8000)
			ws.once('message', (data, isBinary) => {
				clearTimeout(timer)
				if (isBinary) {
					reject(new Error('expected text ready'))
					return
				}
				resolve(data)
			})
			ws.once('error', (err) => {
				clearTimeout(timer)
				reject(err)
			})
		})
		return JSON.parse(String(message)) as { id: string; replay?: string }
	}

	function collect(ws: WebSocket, marker: string) {
		return new Promise<string>((resolve, reject) => {
			let text = ''
			const timer = setTimeout(() => {
				ws.off('message', onMessage)
				reject(new Error(`timeout waiting for ${marker}: ${JSON.stringify(text.slice(-300))}`))
			}, 8000)
			function onMessage(data: RawData, isBinary: boolean) {
				if (!isBinary) return
				text += Buffer.isBuffer(data) ? data.toString('utf8') : Buffer.from(data as ArrayBuffer).toString('utf8')
				if (!text.includes(marker)) return
				clearTimeout(timer)
				ws.off('message', onMessage)
				resolve(text)
			}
			ws.on('message', onMessage)
		})
	}

	it('不传 cwd、相对路径、不存在的路径和文件都会被拒绝', async () => {
		const missing = connect({})
		const missingClose = await closed(missing)
		assert.equal(missingClose.code, 4400)
		assert.match(missingClose.reason, /绝对路径/)

		const relative = connect({ cwd: 'rel' })
		const relativeClose = await closed(relative)
		assert.equal(relativeClose.code, 4400)

		const home = connect({ cwd: '~/.relax' })
		const homeClose = await closed(home)
		assert.equal(homeClose.code, 4400)
		assert.match(homeClose.reason, /~/)

		const gone = connect({ cwd: join(dir, 'nope') })
		const goneClose = await closed(gone)
		assert.equal(goneClose.code, 4404)
		assert.match(goneClose.reason, /不存在/)

		const file = join(dir, 'a.txt')
		writeFileSync(file, 'x')
		const notDir = connect({ cwd: file })
		const notDirClose = await closed(notDir)
		assert.equal(notDirClose.code, 4404)
		assert.match(notDirClose.reason, /不是目录/)
	})

	it('空格和中文目录能启动，输出里能看到 printf', async () => {
		const cwd = join(dir, '子 目录')
		const ws = connect({ cwd })
		const opened = await ready(ws)
		assert.equal(typeof opened.id, 'string')
		const pending = collect(ws, 'hi-pty-marker')
		ws.send(Buffer.from("printf 'hi-pty-marker\\n'\r"))
		const output = await pending
		assert.match(output, /hi-pty-marker/)
		ws.send(JSON.stringify({ type: 'close' }))
		const result = await closed(ws)
		assert.equal(result.code, 1000)
	})

	it('同一目录两条连接是两台终端', async () => {
		const first = connect({ cwd: dir })
		const second = connect({ cwd: dir })
		const a = await ready(first)
		const b = await ready(second)
		assert.notEqual(a.id, b.id)
		first.send(JSON.stringify({ type: 'close' }))
		second.send(JSON.stringify({ type: 'close' }))
		await Promise.all([closed(first), closed(second)])
	})

	it('主动关闭后同一 id 不能再连', async () => {
		const ws = connect({ cwd: dir })
		const opened = await ready(ws)
		ws.send(JSON.stringify({ type: 'close' }))
		const result = await closed(ws)
		assert.equal(result.code, 1000)
		const again = connect({ id: opened.id })
		const againClose = await closed(again)
		assert.equal(againClose.code, 4404)
	})

	it('异常断开后宽限内重连仍是原来的 shell，并能看到缓冲', async () => {
		const ws = connect({ cwd: dir })
		const opened = await ready(ws)
		const armed = collect(ws, 'done-kept-token-9')
		ws.send(Buffer.from(`export RELAX_PTY=kept-token-9; printf 'done-%s\\n' "$RELAX_PTY"\r`))
		await armed
		ws.close()
		await closed(ws)

		const again = connect({ id: opened.id })
		const resumed = await ready(again)
		assert.equal(resumed.id, opened.id)
		assert.match(resumed.replay ?? '', /kept-token-9/)
		const pending = collect(again, 'kept-token-9')
		again.send(Buffer.from(`printf '%s\\n' "$RELAX_PTY"\r`))
		const output = await pending
		assert.match(output, /kept-token-9/)
		again.send(JSON.stringify({ type: 'close' }))
		await closed(again)
	})

	it('宽限到期后 id 作废', async () => {
		serverConfig.ptyGraceMs = 200
		try {
			const ws = connect({ cwd: dir })
			const opened = await ready(ws)
			ws.close()
			await closed(ws)
			await new Promise((resolve) => setTimeout(resolve, 500))
			const again = connect({ id: opened.id })
			const againClose = await closed(again)
			assert.equal(againClose.code, 4404)
		} finally {
			serverConfig.ptyGraceMs = saved.ptyGraceMs
		}
	})

	it('shell 退出时套接字以 4000 关闭', async () => {
		const ws = connect({ cwd: dir })
		await ready(ws)
		const pending = closed(ws)
		ws.send(Buffer.from('exit\r'))
		const result = await pending
		assert.equal(result.code, 4000)
		assert.match(result.reason, /exit/)
	})

	it('超过 ptyMax 时拒绝新连接', async () => {
		serverConfig.ptyMax = 1
		try {
			const ws = connect({ cwd: dir })
			await ready(ws)
			const extra = connect({ cwd: dir })
			const extraClose = await closed(extra)
			assert.equal(extraClose.code, 4429)
			assert.match(extraClose.reason, /上限 1/)
			ws.send(JSON.stringify({ type: 'close' }))
			await closed(ws)
		} finally {
			serverConfig.ptyMax = saved.ptyMax
		}
	})
})
