import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	applyLevels,
	emptyChoice,
	modelGroups,
	nextLevel,
	noteHistory,
	noteSession,
	shownModel,
	shownThinking,
	type ChoiceState,
} from './modelChoice.ts'

const fallback: ChoiceState = {
	...emptyChoice,
	defaultModel: { provider: 'minimax', id: 'MiniMax-M3' },
	defaultLevel: 'medium',
}

describe('model choice', () => {
	it('shows the override, then the session model, then the default', () => {
		assert.deepEqual(shownModel(fallback), { provider: 'minimax', id: 'MiniMax-M3' })
		const opened = noteHistory(noteSession(fallback, 's1'), {
			model: { provider: 'openai', modelId: 'gpt' },
			thinkingLevel: 'high',
		})
		assert.equal(opened.sessionId, 's1')
		assert.deepEqual(shownModel(opened), { provider: 'openai', id: 'gpt' })
		assert.equal(shownThinking(opened), 'high')
		const picked = { ...opened, override: { provider: 'minimax', id: 'MiniMax-M3' } }
		assert.deepEqual(shownModel(picked), picked.override)
	})

	it('drops the override when the open session changes', () => {
		const picked = noteHistory(
			{ ...noteSession(fallback, 's1'), override: { provider: 'openai', id: 'gpt' }, thinkingOverride: 'high' },
			{ model: { provider: 'minimax', modelId: 'MiniMax-M3' }, thinkingLevel: 'low' },
		)
		const next = noteSession(picked, 's2')
		assert.equal(next.override, null)
		assert.equal(next.thinkingOverride, null)
		assert.equal(next.sessionModel, null)
		assert.equal(noteSession(next, 's2'), next)
	})

	it('keeps the current level until the list arrives, then falls back', () => {
		assert.equal(nextLevel('high', [], 'medium'), 'high')
		assert.equal(nextLevel('xhigh', ['off', 'low', 'medium'], 'medium'), 'medium')
		assert.equal(nextLevel('xhigh', ['off', 'low'], 'medium'), 'off')
		const clamped = applyLevels({ ...fallback, sessionThinking: 'xhigh' }, ['off', 'low', 'medium'], 'medium')
		assert.equal(clamped.thinkingOverride, 'medium')
		assert.deepEqual(clamped.levels, ['off', 'low', 'medium'])
		const kept = applyLevels({ ...fallback, sessionThinking: 'low' }, ['off', 'low', 'medium'], 'medium')
		assert.equal(kept.thinkingOverride, null)
		assert.equal(shownThinking(kept), 'low')
	})

	it('puts a session model missing from the catalog in its own group', () => {
		const groups = modelGroups(
			[{ provider: 'minimax', id: 'MiniMax-M3', name: 'MiniMax M3' }],
			{ provider: 'openai', modelId: 'old' },
		)
		assert.equal(groups[0]?.rows[0]?.unavailable, true)
		assert.equal(groups[1]?.label, 'minimax')
		assert.equal(groups[1]?.rows[0]?.label, 'MiniMax M3')
	})
})