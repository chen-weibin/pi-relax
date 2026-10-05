import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SessionManager } from '@earendil-works/pi-coding-agent'
import { ensureRelaxHome } from '../src/config/home.js'
import { createSessionManager } from '../src/sessions/index.js'

export function tempRelaxHome(): string {
	const dir = mkdtempSync(join(tmpdir(), 'relax-home-'))
	process.env.RELAX_HOME = dir
	ensureRelaxHome()
	return dir
}

export function removeHome(dir: string): void {
	rmSync(dir, { recursive: true, force: true })
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
