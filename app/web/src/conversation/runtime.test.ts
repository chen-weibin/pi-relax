import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBlockRuntime } from './runtime.ts'

function installFrame() {
	globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
		callback(0)
		return 1
	}
	globalThis.cancelAnimationFrame = () => {}
}

describe('block runtime', () => {
	it('keeps the order array when a delta only rewrites the open block', () => {
		installFrame()
		const runtime = createBlockRuntime()
		runtime.replace([
			{ role: 'assistant', id: 't5', parts: [{ type: 'text', text: '在', contentIndex: 2 }] },
		])
		const painted = runtime.getSnapshot()
		assert.ok(painted.byKey['t5:2:text'])
		runtime.apply({ type: 'text_delta', messageId: 't5', contentIndex: 2, delta: '啊' })
		const streamed = runtime.getSnapshot()
		assert.equal(streamed.order, painted.order)
		assert.equal(streamed.messageOrder, painted.messageOrder)
		assert.equal(streamed.messages, painted.messages)
		assert.equal(streamed.byKey['t5:2:text']?.data.text, '在啊')
		assert.notEqual(streamed.byKey, painted.byKey)

		runtime.apply({ type: 'text_start', messageId: 't5', contentIndex: 3 })
		assert.notEqual(runtime.getSnapshot().order, painted.order)
	})

	it('closes an open block when the run ends', () => {
		installFrame()
		const runtime = createBlockRuntime()
		runtime.apply({ type: 'text_start', messageId: 'a', contentIndex: 0 })
		runtime.apply({ type: 'text_delta', messageId: 'a', contentIndex: 0, delta: '停' })
		const order = runtime.getSnapshot().order
		runtime.apply({ type: 'run_end' })
		const done = runtime.getSnapshot()
		assert.equal(done.order, order)
		assert.equal(done.byKey['a:0:text']?.contentPhase, 'complete')
		assert.equal(done.byKey['a:0:text']?.data.text, '停')
		assert.equal(done.runPhase, 'complete')
	})
})
