import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SessionManager } from '@earendil-works/pi-coding-agent'
import { ensureRelaxHome } from '../src/config/home.js'
import { closeRelaxDb } from '../src/db/connection.js'
import { serverConfig } from '../src/config/server.js'
import { createSessionManager } from '../src/sessions/index.js'

let previousHome: string | undefined

export function tempRelaxHome(): string {
	const dir = mkdtempSync(join(tmpdir(), 'relax-home-'))
	if (previousHome === undefined) previousHome = serverConfig.home
	serverConfig.home = dir
	ensureRelaxHome()
	return dir
}

export function removeHome(dir: string): void {
	closeRelaxDb()
	rmSync(dir, { recursive: true, force: true })
	if (previousHome === undefined) return
	serverConfig.home = previousHome
	previousHome = undefined
}

export function persistChat(cwd: string, user: string, assistant: string): SessionManager {
	const manager = createSessionManager(cwd)
	manager.appendMessage({
		role: 'user',
		content: [{ type: 'text', text: user }],
		timestamp: Date.now(),
	})
	manager.appendMessage({
		role: 'assistant',
		content: [{ type: 'text', text: assistant }],
		timestamp: Date.now(),
		provider: 'minimax',
		model: 'MiniMax-M3',
		stopReason: 'stop',
		api: 'anthropic-messages',
		usage: {
			input: 1,
			output: 1,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 2,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
	} as never)
	return manager
}
