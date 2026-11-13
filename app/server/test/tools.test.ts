import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { join } from 'node:path'
import { validateToolArguments } from '@earendil-works/pi-ai/utils/validation'
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

	it('declares bash with a required description', async () => {
		const { session } = await createPiRuntime({
			cwd: join(home, 'workspace'),
			sessionManager: createSessionManager(join(home, 'workspace')),
			model: await modelForNewSession(),
		})
		try {
			const bash = session.getAllTools().find((tool) => tool.name === 'bash')
			assert.ok(bash, 'bash tool is registered')
			const schema = bash.parameters as unknown as {
				required?: string[]
				properties?: Record<string, { type?: string }>
			}
			assert.deepEqual(schema.required, ['command', 'description'])
			assert.equal(schema.properties?.description?.type, 'string')

			const call = (args: Record<string, string>) =>
				validateToolArguments(
					{ name: 'bash', description: bash.description, parameters: bash.parameters },
					{ type: 'toolCall', id: 'call-1', name: 'bash', arguments: args },
				)
			assert.deepEqual(call({ command: 'ls', description: '列出目录' }), {
				command: 'ls',
				description: '列出目录',
			})
			assert.throws(() => call({ command: 'ls' }), /description/)
		} finally {
			session.dispose()
		}
	})

	it('declares powershell with a required description', async () => {
		const { session } = await createPiRuntime({
			cwd: join(home, 'workspace'),
			sessionManager: createSessionManager(join(home, 'workspace')),
			model: await modelForNewSession(),
		})
		try {
			const powershell = session.getAllTools().find((tool) => tool.name === 'powershell')
			assert.ok(powershell, 'powershell tool is registered')
			const schema = powershell.parameters as unknown as {
				required?: string[]
				properties?: Record<string, { type?: string }>
			}
			assert.deepEqual(schema.required, ['command', 'description'])
			assert.equal(schema.properties?.description?.type, 'string')

			const call = (args: Record<string, string>) =>
				validateToolArguments(
					{
						name: 'powershell',
						description: powershell.description,
						parameters: powershell.parameters,
					},
					{ type: 'toolCall', id: 'call-1', name: 'powershell', arguments: args },
				)
			assert.deepEqual(call({ command: 'Get-Location', description: '查看当前目录' }), {
				command: 'Get-Location',
				description: '查看当前目录',
			})
			assert.throws(() => call({ command: 'Get-Location' }), /description/)
		} finally {
			session.dispose()
		}
	})
})
