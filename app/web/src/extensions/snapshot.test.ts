import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { captureTerminalSnapshot, moveExtensionKey, type ExtensionSnapshot } from './snapshot.ts'

const terminal = {
	id: 'tab-1',
	pluginId: 'terminal',
	title: '终端',
	reuseKey: 'session:pty-1',
	payload: { sessionId: 'pty-1' },
}

describe('terminal snapshots', () => {
	it('keeps terminals and drops file tabs', () => {
		const snapshot = captureTerminalSnapshot(
			[terminal, { id: 'file-1', pluginId: 'files', title: 'a.ts', reuseKey: 'file:a.ts', payload: { path: 'a.ts' } }],
			true,
			'/work/app',
			'file-1',
		)
		assert.deepEqual(snapshot, {
			cwd: '/work/app',
			extensionOpen: true,
			activeTabId: 'tab-1',
			tabs: [{ id: 'tab-1', title: '终端', reuseKey: 'session:pty-1', sessionId: 'pty-1' }],
		})
	})

	it('moves a draft snapshot onto the session id without clearing its terminals', () => {
		const snap: ExtensionSnapshot = {
			cwd: '/work/app',
			extensionOpen: true,
			activeTabId: 'tab-1',
			tabs: [{ id: 'tab-1', title: '终端', reuseKey: 'session:pty-1', sessionId: 'pty-1' }],
		}
		const moved = moveExtensionKey({ 'draft:/work/app': snap }, 'draft:/work/app', 'session-1')
		assert.deepEqual(moved['session-1'], snap)
		assert.equal(moved['draft:/work/app'], undefined)
	})
})
