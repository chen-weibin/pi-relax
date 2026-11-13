import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { circlesThatFit, limitSiteIcons, siteIconSlots, stackedWidth } from './siteIconSlots.ts'

const items = ['a', 'b', 'c', 'd', 'e', 'f']

describe('siteIconSlots', () => {
	it('shows every item when max is omitted or large enough', () => {
		assert.deepEqual(siteIconSlots(items), { shown: items, overflow: 0 })
		assert.deepEqual(siteIconSlots(items, 6), { shown: items, overflow: 0 })
		assert.deepEqual(siteIconSlots(items, 0), { shown: items, overflow: 0 })
	})

	it('keeps max - 1 icons and counts the rest', () => {
		assert.deepEqual(siteIconSlots(items, 4), { shown: ['a', 'b', 'c'], overflow: 3 })
		assert.deepEqual(siteIconSlots(items, 1), { shown: [], overflow: 6 })
	})
})

describe('circlesThatFit', () => {
	it('counts how many stacked circles fit', () => {
		assert.equal(stackedWidth(7, 20, 8), 92)
		assert.equal(circlesThatFit(100, 20, 8), 7)
		assert.equal(circlesThatFit(10, 20, 8), 1)
	})
})

describe('limitSiteIcons', () => {
	it('uses the tighter of max and the width budget', () => {
		assert.deepEqual(limitSiteIcons(items, 4, 10), { shown: ['a', 'b', 'c'], overflow: 3 })
		assert.deepEqual(limitSiteIcons(items, undefined, 4), { shown: ['a', 'b', 'c'], overflow: 3 })
		assert.deepEqual(limitSiteIcons(items, 4, 4), { shown: ['a', 'b', 'c'], overflow: 3 })
	})
})
