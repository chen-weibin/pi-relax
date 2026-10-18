import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { createPiRuntime } from '../src/agent/factory.js'
import { modelForNewSession, saveApiKey } from '../src/agent/models.js'
import { createSessionManager } from '../src/sessions/index.js'
import { removeHome, tempRelaxHome } from './home.js'

function writeSkill(dir: string, name: string, description: string): string {
	const folder = join(dir, name)
	mkdirSync(folder, { recursive: true })
	const file = join(folder, 'SKILL.md')
	writeFileSync(file, `---\nname: ${name}\ndescription: ${description}\n---\n\nbody\n`)
	return file
}

describe('default skill discovery', () => {
	let home: string
	let previousHomeEnv: string | undefined
	const cwdSkills = {
		user: '',
		project: '',
		ancestor: '',
		shared: '',
	}

	before(async () => {
		home = tempRelaxHome()
		previousHomeEnv = process.env.HOME
		// 基座把 ~/.agents/skills 指到 HOME，隔开本机已有技能。
		process.env.HOME = home
		await saveApiKey('minimax', 'test-key')

		const repo = join(home, 'repo')
		const cwd = join(repo, 'pkg')
		mkdirSync(cwd, { recursive: true })
		const init = spawnSync('git', ['init'], { cwd: repo })
		assert.equal(init.status, 0, init.stderr?.toString())

		cwdSkills.user = writeSkill(join(home, 'agent', 'skills'), 'user-note', 'from the relax agent dir')
		cwdSkills.project = writeSkill(join(cwd, '.pi', 'skills'), 'project-note', 'from the project pi dir')
		cwdSkills.ancestor = writeSkill(join(repo, '.agents', 'skills'), 'ancestor-note', 'from the repo ancestor')
		writeSkill(join(cwd, '.relax', 'skills'), 'relax-note', 'must not load')
		writeSkill(join(home, 'agent', 'skills'), 'shared', 'user copy')
		cwdSkills.shared = writeSkill(join(cwd, '.pi', 'skills'), 'shared', 'project copy')
	})

	after(() => {
		if (previousHomeEnv === undefined) delete process.env.HOME
		else process.env.HOME = previousHomeEnv
		removeHome(home)
	})

	it('loads relax user skills and pi project skills, and keeps the project name', async () => {
		const cwd = join(home, 'repo', 'pkg')
		const { session } = await createPiRuntime({
			cwd,
			sessionManager: createSessionManager(cwd),
			model: await modelForNewSession(),
		})
		try {
			const skills = session.resourceLoader.getSkills().skills
			const byName = new Map(skills.map((skill) => [skill.name, skill]))
			assert.equal(byName.get('user-note')?.filePath, cwdSkills.user)
			assert.equal(byName.get('project-note')?.filePath, cwdSkills.project)
			assert.equal(byName.get('ancestor-note')?.filePath, cwdSkills.ancestor)
			assert.equal(byName.has('relax-note'), false)
			assert.equal(byName.get('shared')?.filePath, cwdSkills.shared)
		} finally {
			session.dispose()
		}
	})
})
