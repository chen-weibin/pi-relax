import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decodePtyData, ptyWebSocketUrl, shouldReconnectPty } from './ptyFrames.ts'

describe('pty websocket url', () => {
	it('encodes cwd once and switches http to ws', () => {
		const url = ptyWebSocketUrl('http://localhost:3001/', {
			cwd: '/Users/chen/a b',
			cols: 80,
			rows: 24,
		})
		assert.equal(
			url,
			'ws://localhost:3001/ws/pty?cwd=%2FUsers%2Fchen%2Fa+b&cols=80&rows=24',
		)
	})

	it('reconnects with the server id', () => {
		const url = ptyWebSocketUrl('http://127.0.0.1:3001', { id: 'abc', cols: 40 })
		assert.equal(url, 'ws://127.0.0.1:3001/ws/pty?id=abc&cols=40')
	})
})

describe('pty frames', () => {
	it('treats the first ready as live output and a replay ready as a reset', () => {
		const decoder = new TextDecoder()
		const first = decodePtyData('{"type":"ready","id":"s1"}', decoder)
		assert.deepEqual(first, { kind: 'ready', id: 's1' })
		assert.equal('replay' in first, false)

		const again = decodePtyData('{"type":"ready","id":"s1","replay":"hi"}', decoder)
		assert.deepEqual(again, { kind: 'ready', id: 's1', replay: 'hi' })

		const bytes = new TextEncoder().encode('ls\r\n')
		const output = decodePtyData(bytes.buffer, decoder)
		assert.deepEqual(output, { kind: 'output', text: 'ls\r\n' })
	})

	it('reconnects only inside the grace window and not after the shell exits', () => {
		const again = shouldReconnectPty({
			userClosed: false,
			code: 1006,
			serverId: 's1',
			now: 1_000,
			retryUntil: 0,
		})
		assert.equal(again.retry, true)
		assert.equal(again.retryUntil, 13_000)

		const late = shouldReconnectPty({
			userClosed: false,
			code: 1006,
			serverId: 's1',
			now: 13_001,
			retryUntil: 13_000,
		})
		assert.equal(late.retry, false)

		const exited = shouldReconnectPty({
			userClosed: false,
			code: 4000,
			serverId: 's1',
			now: 1_000,
			retryUntil: 0,
		})
		assert.equal(exited.retry, false)
	})
})
