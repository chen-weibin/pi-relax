import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { foregroundContrast, MIN_TEXT_CONTRAST, readableForeground } from './themeContrast.ts'

const background = '#151515'

describe('monaco foreground contrast', () => {
	it('lifts dim token colors to the contrast floor', () => {
		for (const color of ['546E7A', '00000050', '#65737E']) {
			const next = readableForeground(color, background)
			assert.ok(foregroundContrast(next, background) >= MIN_TEXT_CONTRAST, color)
		}
	})

	it('leaves colors that are already bright enough', () => {
		assert.equal(readableForeground('#C792EA', background), '#C792EA')
		assert.equal(readableForeground('82AAFF', background), '82AAFF')
		assert.equal(readableForeground('#bbbbbb', background), '#bbbbbb')
	})
})