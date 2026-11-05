import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	classifyRead,
	droppedCachePaths,
	entriesFromList,
	eventsForOpenPath,
	fsWebSocketUrl,
	listedParentsToRefresh,
	parseFsMessage,
	textWriteConfig,
} from './frames.ts'

describe('fs frames', () => {
	it('unwraps list entries and drops malformed rows', () => {
		const entries = entriesFromList({
			path: '/repo',
			entries: [
				{ name: 'src', path: '/repo/src', kind: 'dir', size: 0, mtime: 1 },
				{ name: 'a.txt', path: '/repo/a.txt', kind: 'file', size: 3, mtime: 2 },
				{ name: 'skip' },
			],
		})
		assert.deepEqual(entries, [
			{ name: 'src', path: '/repo/src', kind: 'dir', size: 0 },
			{ name: 'a.txt', path: '/repo/a.txt', kind: 'file', size: 3 },
		])
	})

	it('blocks binary and otherwise decodes text', () => {
		const bytes = new TextEncoder().encode('hi')
		assert.deepEqual(classifyRead({ transfer: 'text', bytes }), {
			kind: 'text',
			text: 'hi',
		})
		assert.deepEqual(classifyRead({ transfer: 'binary', bytes }), {
			kind: 'blocked',
			reason: '当前文件不是文本，无法展示',
		})
	})

	it('sends a whole text file as raw utf-8', () => {
		const config = textWriteConfig('/repo/a.txt', '新')
		assert.equal(config.url, '/api/fs/file')
		assert.deepEqual(config.params, { path: '/repo/a.txt' })
		assert.equal(config.data, '新')
		assert.equal(config.headers['Content-Type'], 'text/plain; charset=utf-8')
		assert.equal(config.headers['X-Relax-Transfer'], 'text')
	})

	it('refreshes only parents that are already listed', () => {
		const changes = [
			{ event: 'change' as const, path: '/repo/src/a.ts' },
			{ event: 'add' as const, path: '/repo/other.txt' },
			{ event: 'unlinkDir' as const, path: '/repo/gone' },
		]
		assert.deepEqual(listedParentsToRefresh(changes, new Set(['/repo', '/repo/src'])), ['/repo/src', '/repo'])
		assert.deepEqual(droppedCachePaths(['/repo/gone', '/repo/gone/child', '/repo/src'], changes), [
			'/repo/gone',
			'/repo/gone/child',
		])
	})

	it('treats a deleted parent directory as the open file going away', () => {
		const events = eventsForOpenPath('/repo/src/a.ts', [
			{ event: 'unlinkDir', path: '/repo/src' },
			{ event: 'change', path: '/repo/src/b.ts' },
		])
		assert.deepEqual(events, ['unlink'])
	})

	it('parses a change batch and builds the watch socket url', () => {
		assert.equal(fsWebSocketUrl('http://localhost:3001/'), 'ws://localhost:3001/ws/fs')
		const message = parseFsMessage(
			JSON.stringify({
				type: 'change',
				path: '/repo',
				changes: [{ event: 'change', path: '/repo/a.txt' }, { event: 'nope', path: '/repo/b.txt' }],
			}),
		)
		assert.deepEqual(message, {
			type: 'change',
			path: '/repo',
			changes: [{ event: 'change', path: '/repo/a.txt' }],
		})
	})
})
