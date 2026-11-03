import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { advanceShown, paceLadder } from './pace.ts'

const oneAtATime = { lag: 24, step: 1 }

describe('chat pace', () => {
	it('reveals one grapheme at a time, including an emoji', () => {
		assert.equal(advanceShown('你好', '', true, oneAtATime), '你')
		assert.equal(advanceShown('你好', '你', true, oneAtATime), '你好')
		assert.equal(advanceShown('👨‍👩‍👧‍👦呀', '', true, oneAtATime), '👨‍👩‍👧‍👦')
	})

	it('reveals a fence one line at a time', () => {
		const text = '前文\n```ts\nconst a = 1\n```\n后'
		assert.equal(advanceShown(text, '前文\n', true), '前文\n```ts\n')
		assert.equal(advanceShown(text, '前文\n```ts\n', true), '前文\n```ts\nconst a = 1\n')
		assert.equal(advanceShown(text, '前文\n```ts\nconst a = 1\n', true), '前文\n```ts\nconst a = 1\n```\n')
	})

	it('triples the step each time the lag ceiling doubles', () => {
		assert.deepEqual(paceLadder(32, 2), [
			{ lag: 32, step: 2 },
			{ lag: 64, step: 6 },
			{ lag: 128, step: 18 },
			{ lag: Number.POSITIVE_INFINITY, step: 54 },
		])
		assert.equal(advanceShown('abcdef', '', true, { lag: 32, step: 2 }), 'ab')
		assert.equal(advanceShown('a'.repeat(40), '', true, oneAtATime).length, 3)
	})

	it('shows the full text when the stream has ended or the text is replaced', () => {
		assert.equal(advanceShown('全文', '全', false), '全文')
		assert.equal(advanceShown('另一段', '全', true), '另一段')
	})
})