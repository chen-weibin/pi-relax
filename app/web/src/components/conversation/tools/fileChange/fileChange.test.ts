import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	countPatchStats,
	countWriteStats,
	editPatchFromDetails,
	fileBasename,
	parseFileChangeArgs,
} from './fileChange.ts'

describe('file change helpers', () => {
	it('reads basename and write args', () => {
		assert.equal(fileBasename('src/app/index.ts'), 'index.ts')
		assert.equal(fileBasename('/tmp/a.ts'), 'a.ts')
		assert.equal(fileBasename(''), '')
		assert.deepEqual(parseFileChangeArgs({ path: 'a.ts', content: 'hi\n' }), {
			path: 'a.ts',
			content: 'hi\n',
			hasEdits: false,
		})
		assert.deepEqual(parseFileChangeArgs(null), { path: '', content: null, hasEdits: false })
	})

	it('normalizes edit argument shapes', () => {
		assert.equal(
			parseFileChangeArgs({
				path: 'a.ts',
				edits: [{ oldText: 'a', newText: 'b' }],
			}).hasEdits,
			true,
		)
		assert.equal(
			parseFileChangeArgs({
				path: 'a.ts',
				edits: JSON.stringify([{ oldText: 'a', newText: 'b' }]),
			}).hasEdits,
			true,
		)
		assert.equal(
			parseFileChangeArgs({
				path: 'a.ts',
				edits: { oldText: 'a', newText: 'b' },
			}).hasEdits,
			true,
		)
		assert.equal(
			parseFileChangeArgs({
				path: 'a.ts',
				oldText: 'a',
				newText: 'b',
			}).hasEdits,
			true,
		)
		assert.equal(parseFileChangeArgs({ path: 'a.ts', edits: [] }).hasEdits, false)
	})

	it('counts write lines and patch +/- lines', () => {
		assert.deepEqual(countWriteStats('a\nb\n'), { additions: 2, deletions: 0 })
		assert.deepEqual(countWriteStats(''), { additions: 0, deletions: 0 })
		assert.deepEqual(countWriteStats('x'), { additions: 1, deletions: 0 })
		assert.deepEqual(
			countPatchStats(['--- a', '+++ b', '@@ -1,2 +1,2 @@', '-old', '+new', ' context'].join('\n')),
			{ additions: 1, deletions: 1 },
		)
		assert.equal(editPatchFromDetails({ patch: 'p' }), 'p')
		assert.equal(editPatchFromDetails({}), null)
		assert.equal(editPatchFromDetails(undefined), null)
	})
})
