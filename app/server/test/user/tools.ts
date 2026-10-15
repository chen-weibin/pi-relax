/**
 * 打印当前服务端构建的 agent 已声明给模型的工具（名字、说明、参数、指引）。
 * 走 createPiRuntime，和线上会话同一套工厂（工具白名单、扩展、关掉的技能和上下文文件）。
 * 不发消息，不写会话文件。
 *
 * 默认打到终端。--file 写到 output/tools.json，终端只打写出的路径。
 *
 * 在本目录执行：
 *   tsx tools.ts
 *   tsx tools.ts --file
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
	const byName = new Map(session.getAllTools().map((tool) => [tool.name, tool]))
	const tools = session.getActiveToolNames().map((name) => byName.get(name))
	const text = `${JSON.stringify(tools, null, 2)}\n`
	if (process.argv.includes('--file')) {
		const out = join(here, 'output', 'tools.json')
		mkdirSync(dirname(out), { recursive: true })
		writeFileSync(out, text)
		console.log(out)
	} else {
		process.stdout.write(text)
	}
} finally {
	session.dispose()
}
