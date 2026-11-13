import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseFindResult, parseGrepResult } from './searchResult.ts'

describe('parseFindResult', () => {
	it('splits paths by line', () => {
		assert.deepEqual(parseFindResult('src/a.ts\nsrc/b.ts'), {
			files: [
				{ path: 'src/a.ts', name: 'a.ts' },
				{ path: 'src/b.ts', name: 'b.ts' },
			],
			notice: '',
		})
	})

	it('gives no files for the empty-match message', () => {
		assert.deepEqual(parseFindResult('No files found matching pattern'), {
			files: [],
			notice: '',
		})
	})

	it('strips the truncation notice before counting paths', () => {
		const text = 'a.ts\nb.ts\n\n[1000 results limit reached. Use limit=2000 for more]'
		assert.deepEqual(parseFindResult(text), {
			files: [
				{ path: 'a.ts', name: 'a.ts' },
				{ path: 'b.ts', name: 'b.ts' },
			],
			notice: '1000 results limit reached. Use limit=2000 for more',
		})
	})
})

describe('parseGrepResult', () => {
	it('aggregates match lines by file in first-seen order', () => {
		const text = [
			'src/a.ts:10: export const a',
			'src/b.ts:1: hello',
			'src/a.ts:20: export const b',
		].join('\n')
		assert.deepEqual(parseGrepResult(text), {
			files: [
				{ path: 'src/a.ts', name: 'a.ts', matchCount: 2 },
				{ path: 'src/b.ts', name: 'b.ts', matchCount: 1 },
			],
			notice: '',
		})
	})

	it('ignores context lines that use dashes', () => {
		const text = [
			'src/a.ts-9- // comment',
			'src/a.ts:10: export const a',
			'src/a.ts-11- next',
		].join('\n')
		assert.deepEqual(parseGrepResult(text), {
			files: [{ path: 'src/a.ts', name: 'a.ts', matchCount: 1 }],
			notice: '',
		})
	})

	it('gives no files for the empty-match message', () => {
		assert.deepEqual(parseGrepResult('No matches found'), { files: [], notice: '' })
	})
})
