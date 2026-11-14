import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { archiveDesc, parseSearchDocument, searchKeywords } from './webResult.ts'

describe('searchKeywords', () => {
	it('prefers the queries list and otherwise uses the single query', () => {
		assert.deepEqual(searchKeywords({ queries: ['a', 'b'] }), ['a', 'b'])
		assert.deepEqual(searchKeywords({ query: 'pi' }), ['pi'])
		assert.deepEqual(searchKeywords(null), [])
	})
})

describe('parseSearchDocument', () => {
	it('keeps markdown intact and turns a Source line into an inline directive', () => {
		const text = [
			'**Providers used:** Query 1: exa',
			'',
			'## Query: "pi docs"',
			'',
			'# Pi',
			'',
			'Runs in the terminal.',
			'',
			'```bash',
			'curl https://pi.dev',
			'```',
			'Source: Pi (https://pi.dev/docs/latest)',
			'',
			'**Sources:**',
			'1. Pi',
			'   https://pi.dev/docs/latest',
			'',
			'---',
			'Full search results are stored as responseId "abc". Use get_search_content to read them.',
		].join('\n')
		assert.deepEqual(parseSearchDocument(text), {
			sites: [{ name: 'Pi', url: 'https://pi.dev/docs/latest' }],
			markdown: ['Pi', '', 'Runs in the terminal.', '', '```bash', 'curl https://pi.dev', '```', ':source[Pi]{url="https://pi.dev/docs/latest"}'].join('\n'),
		})
	})

	it('strips a leading hash on each hit and puts a rule between hits', () => {
		const text = [
			'# Pi is a harness. ## Start',
			'Source: Pi (https://pi.dev/docs/latest)',
			'',
			'# There are many harnesses.',
			'Source: Pi Coding Agent (https://pi.dev/)',
		].join('\n')
		assert.equal(
			parseSearchDocument(text).markdown,
			[
				'Pi is a harness. ## Start',
				':source[Pi]{url="https://pi.dev/docs/latest"}',
				'',
				'---',
				'',
				'There are many harnesses.',
				':source[Pi Coding Agent]{url="https://pi.dev/"}',
			].join('\n'),
		)
	})

	it('leaves a Source line inside a fence alone', () => {
		const text = ['```', 'Source: Pi (https://pi.dev)', '```'].join('\n')
		assert.equal(parseSearchDocument(text).markdown, text)
	})

	it('gives nothing for a progress line', () => {
		assert.deepEqual(parseSearchDocument('Searching "pi" (1/2 complete)...'), { sites: [], markdown: '' })
	})
})

describe('archiveDesc', () => {
	it('uses the title, then the url, then a short response id', () => {
		assert.deepEqual(archiveDesc({ url: 'https://pi.dev' }, { title: 'Pi' }), { desc: 'Pi', url: 'https://pi.dev' })
		assert.equal(archiveDesc({ responseId: 'mwecutbn85nfds' }, undefined).desc, 'mwecutbn')
	})
})
