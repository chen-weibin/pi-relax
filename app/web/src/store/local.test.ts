import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseLocalDocument } from './local.ts'

describe('parseLocalDocument', () => {
	it('treats bad JSON as an empty document', () => {
		assert.deepEqual(parseLocalDocument('not json'), { version: 1, layout: {}, projectsCollapsed: [], extensions: {} })
		assert.deepEqual(parseLocalDocument(null), { version: 1, layout: {}, projectsCollapsed: [], extensions: {} })
		assert.deepEqual(parseLocalDocument('[]'), { version: 1, layout: {}, projectsCollapsed: [], extensions: {} })
	})

	it('drops a document whose version is not 1', () => {
		const raw = JSON.stringify({
			version: 2,
			layout: { 'app-shell': { sidebar: 200 } },
			projectsCollapsed: ['default'],
		})
		assert.deepEqual(parseLocalDocument(raw), { version: 1, layout: {}, projectsCollapsed: [], extensions: {} })
		assert.deepEqual(parseLocalDocument(JSON.stringify({ layout: {}, projectsCollapsed: [] })), {
			version: 1,
			layout: {},
			projectsCollapsed: [],
			extensions: {},
		})
	})

	it('keeps layout objects and dedupes collapsed project ids', () => {
		const raw = JSON.stringify({
			version: 1,
			layout: { 'app-shell': { sidebar: 240, main: 800 }, 'main-area': 'nope' },
			projectsCollapsed: ['default', 'default', '', 'p1', 2, 'p1'],
		})
		assert.deepEqual(parseLocalDocument(raw), {
			version: 1,
			layout: { 'app-shell': { sidebar: 240, main: 800 } },
			projectsCollapsed: ['default', 'p1'],
			extensions: {},
		})
	})

	it('keeps terminal snapshots and drops a file tab', () => {
		const raw = JSON.stringify({
			version: 1,
			layout: {},
			projectsCollapsed: [],
			extensions: {
				'session-1': {
					cwd: '/work/app',
					extensionOpen: true,
					activeTabId: 'file-1',
					tabs: [
						{ id: 'tab-1', title: '终端', reuseKey: 'session:pty-1', sessionId: 'pty-1' },
						{ id: 'file-1', title: 'a.ts', path: 'a.ts' },
					],
				},
				broken: { extensionOpen: true },
			},
		})
		assert.deepEqual(parseLocalDocument(raw).extensions, {
			'session-1': {
				cwd: '/work/app',
				extensionOpen: true,
				activeTabId: 'tab-1',
				tabs: [{ id: 'tab-1', title: '终端', reuseKey: 'session:pty-1', sessionId: 'pty-1' }],
			},
		})
	})
})
