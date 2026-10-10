import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export function getRelaxHome(): string {
	return process.env.RELAX_HOME ?? join(homedir(), '.relax')
}

export function getRelaxAgentDir(): string {
	return join(getRelaxHome(), 'agent')
}

/** 未传 cwd 时的默认工作区。 */
export function getDefaultWorkspace(): string {
	return join(getRelaxHome(), 'workspace')
}

/** Ensure ~/.relax/agent/sessions and the default workspace exist, and point pi's getAgentDir() at agent. */
export function ensureRelaxHome(): string {
	const agentDir = getRelaxAgentDir()
	mkdirSync(join(agentDir, 'sessions'), { recursive: true })
	mkdirSync(getDefaultWorkspace(), { recursive: true })
	process.env.PI_CODING_AGENT_DIR = agentDir
	const webSearchConfig = join(agentDir, 'web-search.json')
	if (!existsSync(webSearchConfig)) {
		// eager：四个联网工具从第一轮就在，不注册 web_enable。已有文件不覆盖。
		writeFileSync(webSearchConfig, `${JSON.stringify({ toolActivation: 'eager' }, null, 2)}\n`)
	}
	return agentDir
}
