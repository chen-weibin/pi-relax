import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { join } from 'node:path'
import { ACTIVE_TOOLS, createPiRuntime } from '../src/agent/factory.js'
import { modelForNewSession, saveApiKey } from '../src/agent/models.js'
import { createSessionManager } from '../src/sessions/index.js'
import { ensureRelaxHome } from '../src/config/home.js'
import { removeHome, tempRelaxHome } from './home.js'

const HIDDEN = ['tool_search', 'web_enable']

describe('active tools', () => {
	let home: string

	before(async () => {
		home = tempRelaxHome()
		await saveApiKey('minimax', 'test-key')
	})

	after(() => {
		removeHome(home)
	})

	it('writes eager web-search config without replacing an existing file', () => {
		const path = join(home, 'agent', 'web-search.json')
		assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { toolActivation: 'eager' })
		writeFileSync(path, `${JSON.stringify({ toolActivation: 'dynamic', keep: true })}\n`)
		ensureRelaxHome()
		assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { toolActivation: 'dynamic', keep: true })
	})

	it('activates the builtin, codemode, and web tools', async () => {
		const { session } = await createPiRuntime({
			cwd: join(home, 'workspace'),
			sessionManager: createSessionManager(join(home, 'workspace')),
			model: await modelForNewSession(),
		})
		try {
			const names = new Set(session.getActiveToolNames())
			assert.deepEqual([...names].sort(), [...ACTIVE_TOOLS].sort())
			for (const name of HIDDEN) assert.equal(names.has(name), false)
		} finally {
			session.dispose()
		}
	})
})
