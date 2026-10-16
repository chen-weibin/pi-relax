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
		assert.equal(defaults.fsMaxBytes, 16 * 1024 * 1024)
		assert.equal(defaults.fsWatchDebounceMs, 600)
		assert.equal(defaults.fsWatchMax, 16)
		assert.equal(defaults.jsonBodyLimit, 1024 * 1024)
		assert.equal(defaults.ssePingMs, 15_000)

		const partial = join(dir, 'partial.json')
		writeFileSync(partial, JSON.stringify({ home: '~/custom', fsMaxBytes: 8 }))
		const loaded = loadServerConfig(partial)
		assert.equal(loaded.home, join(homedir(), 'custom'))
		assert.equal(loaded.fsMaxBytes, 8)
		assert.equal(loaded.fsWatchMax, defaults.fsWatchMax)
		assert.equal(loaded.ssePingMs, defaults.ssePingMs)
	})

	it('类型不对的字段回退默认，JSON 解析失败则抛错', () => {
		const defaults = loadServerConfig(join(dir, 'missing.json'))
		const bad = join(dir, 'bad.json')
		writeFileSync(
			bad,
			JSON.stringify({
				home: '',
				fsMaxBytes: '4',
				fsWatchDebounceMs: 1.5,
				fsWatchMax: -1,
				jsonBodyLimit: 0,
				ssePingMs: true,
			}),
		)
		const loaded = loadServerConfig(bad)
		assert.deepEqual(loaded, defaults)

		const broken = join(dir, 'broken.json')
		writeFileSync(broken, '{')
		assert.throws(() => loadServerConfig(broken), /无法解析/)
	})
})
