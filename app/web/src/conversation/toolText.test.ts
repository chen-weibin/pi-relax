import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatToolArguments, parseToolArguments } from './toolText.ts'

describe('tool arguments text', () => {
	it('round-trips an object through format and parse', () => {
		const text = formatToolArguments({ command: 'git status', description: '看仓库状态' })
		assert.deepEqual(parseToolArguments(text), { command: 'git status', description: '看仓库状态' })
	})

	it('gives null while the arguments are still streaming', () => {
		assert.equal(parseToolArguments('{"command":"git st'), null)
	})

	it('gives null for empty text and for non-object arguments', () => {
		assert.equal(parseToolArguments(''), null)
		assert.equal(parseToolArguments('"bash"'), null)
		assert.equal(parseToolArguments('42'), null)
		assert.equal(parseToolArguments('[1,2]'), null)
	})
})
