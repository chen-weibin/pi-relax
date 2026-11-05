import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { captureTerminalSnapshot, moveExtensionKey, readExtensionBook, type ExtensionSnapshot } from './snapshot.ts'

const terminal = {
	id: 'tab-1',
	pluginId: 'terminal',
	title: '终端',
	reuseKey: 'session:pty-1',
	payload: { sessionId: 'pty-1' },
}

describe('extension snapshots', () => {
	it('keeps file tabs and terminals in order, and leaves a selected file selected', () => {
		const snapshot = captureTerminalSnapshot(
			[
				{ id: 'file-1', pluginId: 'files', title: 'a.ts •', reuseKey: 'file:/work/app/a.ts', payload: { kind: 'file', path: '/work/app/a.ts' } },
				terminal,
				{ id: 'explore-1', pluginId: 'files', title: '文件', reuseKey: 'explorer', payload: { kind: 'explorer' } },
			],
			true,
			'/work/app',
			'file-1',
		)
		assert.deepEqual(snapshot, {
			cwd: '/work/app',
			extensionOpen: true,
			activeTabId: 'file-1',
			tabs: [
				{ id: 'file-1', reuseKey: 'file:/work/app/a.ts', path: '/work/app/a.ts' },
				{ id: 'tab-1', title: '终端', reuseKey: 'session:pty-1', sessionId: 'pty-1' },
				{ id: 'explore-1', reuseKey: 'explorer' },
			],
		})
	})

	it('reads an older snapshot that only stored terminals', () => {
		const book = readExtensionBook({
			'session-1': {
				cwd: '/work/app',
				extensionOpen: true,
				activeTabId: 'tab-1',
				tabs: [{ id: 'tab-1', title: '终端', reuseKey: 'session:pty-1', sessionId: 'pty-1' }],
			},
		})
		assert.deepEqual(book['session-1']?.tabs, [
			{ id: 'tab-1', title: '终端', reuseKey: 'session:pty-1', sessionId: 'pty-1' },
		])
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
