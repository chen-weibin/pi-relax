import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { themeStyleVars } from './theme.ts'

describe('theme overrides', () => {
	it('writes only the keys that were passed', () => {
		const style = themeStyleVars({ caret: '#ff0000', fontSize: '18px' })
		assert.equal(style['--md-editor-caret'], '#ff0000')
		assert.equal(style['--md-editor-font-size'], '18px')
		assert.equal(style['--md-editor-bg'], undefined)
	})
})
