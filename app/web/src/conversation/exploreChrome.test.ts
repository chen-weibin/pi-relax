import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { activityForTail, chromeForExplore, PLANNING_LABEL } from './exploreChrome.ts'
import type { BlockSnapshot } from './types.ts'

function thinking(key: string, phase: BlockSnapshot['contentPhase']): BlockSnapshot {
	return { key, messageId: 'a', kind: 'thinking', contentPhase: phase, data: { text: '' } }
}

function tool(key: string, name: string, phase: BlockSnapshot['contentPhase']): BlockSnapshot {
	return {
		key,
		messageId: 'a',
		kind: 'tool',
		contentPhase: phase,
		data: { name, argumentsText: '', resultText: '', isError: false },
	}
}

describe('explore chrome', () => {
	it('plans before any block, and wraps the first live block without a tool count', () => {
		assert.deepEqual(chromeForExplore([], true), { mode: 'activity', label: PLANNING_LABEL })
		const one = thinking('t', 'open')
		assert.deepEqual(chromeForExplore([one], true), {
			mode: 'group',
			trail: null,
			activity: '思考',
			focusKey: 't',
		})
	})

	it('returns to planning once the current block has finished, and drops the line when idle', () => {
		const blocks = [thinking('t', 'complete'), tool('call', 'read', 'complete')]
		assert.deepEqual(chromeForExplore(blocks, true), {
			mode: 'group',
			trail: '1 个工具',
			activity: PLANNING_LABEL,
			focusKey: null,
		})
		assert.deepEqual(chromeForExplore(blocks, false), {
			mode: 'group',
			trail: '1 个工具',
			activity: null,
			focusKey: null,
		})
		assert.equal(chromeForExplore([thinking('t', 'complete')], false).mode, 'single')
	})

	it('follows the open block and does not count thinking', () => {
		const blocks = [thinking('t', 'complete'), tool('call', 'read', 'open'), thinking('t2', 'complete')]
		const chrome = chromeForExplore(blocks, true)
		assert.equal(chrome.mode, 'group')
		if (chrome.mode !== 'group') return
		assert.equal(chrome.activity, '查看文件')
		assert.equal(chrome.focusKey, 'call')
		assert.equal(chrome.trail, '1 个工具')
	})

	it('shows planning until a live explore group is the tail, then that group’s current name', () => {
		assert.deepEqual(activityForTail([], true, true), { label: PLANNING_LABEL, focusKey: null })
		const block = tool('call', 'bash', 'open')
		assert.deepEqual(activityForTail([{ type: 'explore', id: 'e', blocks: [block] }], true, false), {
			label: '运行',
			focusKey: 'call',
		})
		assert.equal(activityForTail([{ type: 'text', id: 'x', block: thinking('t', 'open') }], true, false), null)
		assert.deepEqual(activityForTail([{ type: 'explore', id: 'e', blocks: [tool('call', 'write', 'complete')] }], true, false), {
			label: PLANNING_LABEL,
			focusKey: null,
		})
	})
})
