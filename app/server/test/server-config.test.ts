import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { loadServerConfig } from '../src/config/server.js'

describe('server config', () => {
	const dir = mkdtempSync(join(tmpdir(), 'relax-config-'))
	after(() => rmSync(dir, { recursive: true, force: true }))

	it('缺文件用默认，缺键保留默认，合法值被采用', () => {
		const defaults = loadServerConfig(join(dir, 'missing.json'))
		assert.equal(defaults.home, join(homedir(), '.relax'))
		assert.equal(defaults.fs.maxBytes, 16 * 1024 * 1024)
		assert.equal(defaults.fs.watchDebounceMs, 600)
		assert.equal(defaults.fs.watchMax, 16)
		assert.equal(defaults.http.jsonBodyLimit, 1024 * 1024)
		assert.equal(defaults.http.ssePingMs, 15_000)
		assert.equal(defaults.pty.cols, 80)
		assert.equal(defaults.pty.rows, 24)
		assert.equal(defaults.pty.max, 16)
		assert.equal(defaults.pty.replayBytes, 100 * 1024)
		assert.equal(defaults.pty.graceMs, 15_000)

		const partial = join(dir, 'partial.json')
		writeFileSync(partial, JSON.stringify({ home: '~/custom', fs: { maxBytes: 8 } }))
		const loaded = loadServerConfig(partial)
		assert.equal(loaded.home, join(homedir(), 'custom'))
		assert.equal(loaded.fs.maxBytes, 8)
		assert.equal(loaded.fs.watchMax, defaults.fs.watchMax)
		assert.equal(loaded.http.ssePingMs, defaults.http.ssePingMs)
	})

	it('类型不对的字段回退默认，JSON 解析失败则抛错', () => {
		const defaults = loadServerConfig(join(dir, 'missing.json'))
		const bad = join(dir, 'bad.json')
		writeFileSync(
			bad,
			JSON.stringify({
				home: '',
				fs: { maxBytes: '4', watchDebounceMs: 1.5, watchMax: -1 },
				http: { jsonBodyLimit: 0, ssePingMs: true },
			}),
		)
		const loaded = loadServerConfig(bad)
		assert.deepEqual(loaded, defaults)

		const broken = join(dir, 'broken.json')
		writeFileSync(broken, '{')
		assert.throws(() => loadServerConfig(broken), /无法解析/)
	})
})
