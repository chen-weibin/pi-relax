import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { armTape, parseTapeFile, pushTape, tapeFile } from './tape.ts'

function raw(sessionId: string, event: unknown): string {
	return JSON.stringify({ sessionId, event })
}

describe('chat tape', () => {
	it('records the next idle turn through agent_settled and exports offsets', () => {
		let tape = armTape(false)
		tape = pushTape(tape, raw('other', { type: 'agent_start' }), 500, 's1')
		tape = pushTape(tape, raw('s1', { type: 'message_end', message: { role: 'user' } }), 1000, 's1')
		tape = pushTape(tape, raw('s1', { type: 'agent_start' }), 1016, 's1')
		tape = pushTape(tape, raw('s1', { type: 'agent_settled' }), 1100, 's1')
		assert.equal(tape.phase, 'done')
		assert.equal(tape.frames.length, 3)
		assert.deepEqual(tapeFile(tape.frames), {
			version: 1,
			frames: [
				{ offsetMs: 0, data: tape.frames[0]?.data },
				{ offsetMs: 16, data: tape.frames[1]?.data },
				{ offsetMs: 100, data: tape.frames[2]?.data },
			],
		})
	})

	it('skips the in-flight turn when armed while busy', () => {
		let tape = armTape(true)
		tape = pushTape(tape, raw('s1', { type: 'agent_start' }), 1, 's1')
		tape = pushTape(tape, raw('s1', { type: 'agent_settled' }), 2, 's1')
		assert.equal(tape.phase, 'wait')
		tape = pushTape(tape, raw('s1', { type: 'agent_start' }), 10, 's1')
		tape = pushTape(tape, raw('s1', { type: 'agent_settled' }), 20, 's1')
		assert.equal(tape.phase, 'done')
		assert.equal(tape.frames.length, 2)
		assert.equal(tape.frames[0]?.t, 10)
	})

	it('rejects a tape file whose offsets go backwards', () => {
		assert.equal(
			parseTapeFile({
				version: 1,
				frames: [
					{ offsetMs: 10, data: '{}' },
					{ offsetMs: 5, data: '{}' },
				],
			}),
			null,
		)
		const file = parseTapeFile({ version: 1, frames: [{ offsetMs: 0, data: '{"sessionId":"s","event":{}}' }] })
		assert.equal(file?.frames.length, 1)
	})
})
