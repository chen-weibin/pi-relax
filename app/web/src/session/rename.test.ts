import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nextSessionName } from './rename.ts'

describe('nextSessionName', () => {
	it('skips a blank or unchanged title and keeps a new one', () => {
		assert.equal(nextSessionName('计划', '   '), null)
		assert.equal(nextSessionName('计划', ''), null)
		assert.equal(nextSessionName('计划', '计划'), null)
		assert.equal(nextSessionName('计划', '  计划  '), null)
		assert.equal(nextSessionName('计划', '  新标题  '), '新标题')
	})
})
