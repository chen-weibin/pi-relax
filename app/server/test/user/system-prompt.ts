/**
 * 打印当前服务端构建的 agent 系统提示词。
 * 走 createPiRuntime，和线上会话同一套工厂（工具白名单、扩展、关掉的技能和上下文文件）。
 * 不发消息，不写会话文件。
 *
 * 默认打到终端。--file 写到 output/system-prompt.md，终端只打写出的路径。
 *
 * 在本目录执行：
 *   tsx system-prompt.ts
 *   tsx system-prompt.ts --file
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createPiRuntime } from '../../src/agent/factory.js'
import { modelForNewSession } from '../../src/agent/models.js'
import { ensureRelaxHome, getDefaultWorkspace } from '../../src/config/home.js'
import { createSessionManager } from '../../src/sessions/index.js'

const here = dirname(fileURLToPath(import.meta.url))
config({ path: join(here, '..', '..', '.env'), quiet: true })
ensureRelaxHome()

const cwd = getDefaultWorkspace()
const { session } = await createPiRuntime({
	cwd,
	sessionManager: createSessionManager(cwd),
	model: await modelForNewSession(),
})

try {
	const prompt = session.systemPrompt.endsWith('\n') ? session.systemPrompt : `${session.systemPrompt}\n`
	if (process.argv.includes('--file')) {
		const out = join(here, 'output', 'system-prompt.md')
		mkdirSync(dirname(out), { recursive: true })
		writeFileSync(out, prompt)
		console.log(out)
	} else {
		process.stdout.write(prompt)
	}
} finally {
	session.dispose()
}
