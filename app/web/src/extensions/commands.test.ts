import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CommandError, executeCommand, executeCommandSync, registerCommand } from './commands.ts'

declare module './commands.ts' {
	interface CommandMap {
		'test.sync': { args: { n: number }; result: number; sync: true }
		'test.optional': { args: { cwd?: string }; result: string; sync: true }
		'test.none': { args: void; result: string; sync: true }
		'test.async': { args: void; result: string; sync: false }
	}
}

describe('command bus', () => {
	it('returns sync and async results from executeCommand', async () => {
		const sync = registerCommand('test.sync', (args) => args.n + 1)
		const asyncCmd = registerCommand('test.async', async () => 'ok')
		try {
			assert.equal(await executeCommand('test.sync', { n: 2 }), 3)
			assert.equal(await executeCommand('test.async'), 'ok')
			assert.equal(executeCommandSync('test.sync', { n: 4 }), 5)
		} finally {
			sync.dispose()
			asyncCmd.dispose()
		}
	})

	it('rejects a missing command and throws when a sync call sees a promise', async () => {
		const listed = registerCommand('test.none', () => 'list')
		listed.dispose()
		await assert.rejects(executeCommand('test.none'), (error: unknown) => {
			assert.ok(error instanceof CommandError)
			assert.equal(error.code, 'NOT_FOUND')
			return true
		})
		assert.throws(
			() => executeCommandSync('test.none'),
			(error: unknown) => error instanceof CommandError && error.code === 'NOT_FOUND',
		)

		const promised = registerCommand(
			'test.sync',
			(() => Promise.resolve(1)) as (args: { n: number }) => number,
		)
		try {
			assert.throws(
				() => executeCommandSync('test.sync', { n: 1 }),
				(error: unknown) => error instanceof CommandError && error.code === 'ASYNC',
			)
		} finally {
			promised.dispose()
		}
	})

	it('refuses a duplicate id until the first registration is disposed', () => {
		const first = registerCommand('test.optional', (args) => args?.cwd ?? 'here')
		assert.throws(
			() => registerCommand('test.optional', () => 'other'),
			(error: unknown) => error instanceof CommandError && error.code === 'DUPLICATE',
		)
		assert.equal(executeCommandSync('test.optional'), 'here')
		assert.equal(executeCommandSync('test.optional', { cwd: '/tmp' }), '/tmp')
		first.dispose()
		const second = registerCommand('test.optional', () => 'other')
		try {
			assert.equal(executeCommandSync('test.optional'), 'other')
		} finally {
			second.dispose()
		}
	})
})
