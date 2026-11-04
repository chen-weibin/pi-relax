import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { exploreHeading, layoutTurns, showAwaiting } from './explore.ts'
import { createBlockRuntime } from './runtime.ts'

function installFrame() {
	globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
		callback(0)
		return 1
	}
	globalThis.cancelAnimationFrame = () => {}
}

describe('explore layout', () => {
	it('groups thinking and tools until text, and only awaits before the first block', () => {
		installFrame()
		const runtime = createBlockRuntime()
		runtime.replace([
			{ role: 'user', id: 'u', text: '你好' },
			{
				role: 'assistant',
				id: 'a',
				parts: [
					{ type: 'thinking', text: '想', contentIndex: 0 },
					{
						type: 'tool',
						contentIndex: 1,
						id: 'call',
						name: 'read',
						argumentsText: '',
						resultText: '文件',
						isError: false,
					},
					{ type: 'text', text: '好', contentIndex: 2 },
				],
			},
		])
		const laid = layoutTurns(runtime.getSnapshot())
		assert.equal(laid.turns.length, 1)
		assert.deepEqual(
			laid.turns[0]?.segments.map((segment) => segment.type),
			['user', 'explore', 'text'],
		)
		const explore = laid.turns[0]?.segments[1]
		assert.equal(explore?.type, 'explore')
		if (explore?.type === 'explore') assert.deepEqual(explore.blocks.map((block) => block.kind), ['thinking', 'tool'])
		assert.equal(showAwaiting(runtime.getSnapshot()), false)

		runtime.apply({ type: 'run_start' })
		runtime.apply({ type: 'user', messageId: 'u2', text: '再来' })
		assert.equal(showAwaiting(runtime.getSnapshot()), true)
		runtime.apply({ type: 'thinking_start', messageId: 'a2', contentIndex: 0 })
		assert.equal(showAwaiting(runtime.getSnapshot()), false)
		const heading = exploreHeading(
			[runtime.getSnapshot().byKey['a2:0:thinking']].filter((block) => block !== undefined),
			true,
		)
		assert.deepEqual(heading, { title: '思考', blinking: true })
	})
})
