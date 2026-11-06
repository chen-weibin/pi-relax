import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { listOpenTerminals, shellInput } from './commandInput.ts'

describe('terminal command input', () => {
	it('appends a carriage return only when the line has no line ending', () => {
		assert.equal(shellInput('ls'), 'ls\r')
		assert.equal(shellInput('ls\n'), 'ls\n')
		assert.equal(shellInput('ls\r'), 'ls\r')
		assert.equal(shellInput('ls\r\n'), 'ls\r\n')
	})

	it('lists open terminal sessions and marks the active tab', () => {
		const sessions = listOpenTerminals(
			[
				{ id: 'file', pluginId: 'files', title: 'a.ts', payload: { kind: 'file', path: 'a.ts' } },
				{ id: 'bad', pluginId: 'terminal', title: '坏的', payload: {} },
				{ id: 't1', pluginId: 'terminal', title: '终端', payload: { sessionId: 's1' } },
				{ id: 't2', pluginId: 'terminal', title: '第二个', payload: { sessionId: 's2' } },
			],
			't2',
		)
		assert.deepEqual(sessions, [
			{ sessionId: 's1', tabId: 't1', title: '终端', active: false },
			{ sessionId: 's2', tabId: 't2', title: '第二个', active: true },
		])
	})
})
