import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export function getRelaxHome(): string {
	return process.env.RELAX_HOME ?? join(homedir(), '.relax')
}

export function getRelaxAgentDir(): string {
	return join(getRelaxHome(), 'agent')
}

/** Ensure ~/.relax/agent/sessions exists and point pi's getAgentDir() at it. */
export function ensureRelaxHome(): string {
	const agentDir = getRelaxAgentDir()
	mkdirSync(join(agentDir, 'sessions'), { recursive: true })
	process.env.PI_CODING_AGENT_DIR = agentDir
	return agentDir
}
