import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { describeLsEntries, parseLsListing } from './lsListing.ts'

describe('ls listing text', () => {
	it('splits entries by line and keeps the directory slash', () => {
		assert.deepEqual(parseLsListing('a.ts\nsrc/\nREADME.md'), {
			entries: ['a.ts', 'src/', 'README.md'],
			notice: '',
		})
	})

	it('gives no entries for an empty directory', () => {
		assert.deepEqual(parseLsListing('(empty directory)'), { entries: [], notice: '' })
	})

	it('takes the truncation notice off the entry count', () => {
		const text = 'a.ts\nb.ts\n\n[500 entries limit reached. Use limit=1000 for more]'
		assert.deepEqual(parseLsListing(text), {
			entries: ['a.ts', 'b.ts'],
			notice: '500 entries limit reached. Use limit=1000 for more',
		})
	})

	it('gives nothing for empty text', () => {
		assert.deepEqual(parseLsListing(''), { entries: [], notice: '' })
	})
})

describe('ls entry description', () => {
	it('counts files and folders by the slash suffix', () => {
		assert.equal(describeLsEntries(['a.ts', 'src/', 'b.ts', 'lib/']), '2 个文件，2 个文件夹')
	})

	it('drops the part that is zero', () => {
		assert.equal(describeLsEntries(['src/']), '1 个文件夹')
		assert.equal(describeLsEntries(['a.ts']), '1 个文件')
	})

	it('gives nothing for no entries', () => {
		assert.equal(describeLsEntries([]), '')
	})
})
