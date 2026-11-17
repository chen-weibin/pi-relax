import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { SETTING_ENTRIES, SETTING_GROUP_IDS, searchSettings } from './settingSearch.ts'

const settingDir = dirname(fileURLToPath(import.meta.url))
const settingSource = readdirSync(settingDir)
	.filter((name) => name.endsWith('.tsx'))
	.map((name) => readFileSync(join(settingDir, name), 'utf8'))
	.join('\n')

describe('searchSettings', () => {
	it('returns nothing for an empty or blank query', () => {
		assert.deepEqual(searchSettings(''), [])
		assert.deepEqual(searchSettings('   '), [])
	})

	it('matches a label and a keyword without case, and trims the query', () => {
		assert.deepEqual(
			searchSettings('出队').map((entry) => entry.id),
			['follow-up', 'abort-queue'],
		)
		assert.deepEqual(
			searchSettings('FOLLOWUPMODE').map((entry) => entry.id),
			['follow-up'],
		)
		assert.deepEqual(
			searchSettings('  一次一条  ').map((entry) => entry.id),
			['follow-up'],
		)
	})

	it('returns one item per match when the same category has several', () => {
		const hits = searchSettings('删除')
		assert.deepEqual(
			hits.map((entry) => entry.label),
			['会话', '项目'],
		)
		assert.equal(new Set(hits.map((entry) => entry.category)).size, 1)
	})

	it('returns each avatar row when the group keyword matches', () => {
		const hits = searchSettings('头像')
		assert.deepEqual(
			hits.map((entry) => entry.id),
			['avatar-source', 'avatar-shape', 'avatar-color', 'avatar-expression'],
		)
	})

	it('rejects a query that hits none of the entries', () => {
		assert.deepEqual(searchSettings('不存在的设置'), [])
	})

	it('anchors every catalog id and group fallback in the setting panels', () => {
		const ids = SETTING_ENTRIES.map((entry) => entry.id)
		assert.equal(new Set(ids).size, ids.length)
		for (const id of [...ids, ...SETTING_GROUP_IDS]) {
			assert.equal(settingSource.includes(`"${id}"`) || settingSource.includes(`'${id}'`), true, id)
		}
	})
})
