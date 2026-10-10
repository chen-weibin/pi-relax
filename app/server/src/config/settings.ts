import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { CONFIG_DIR_NAME } from '@earendil-works/pi-coding-agent'
import { getRelaxAgentDir } from './home.js'

const require = createRequire(import.meta.url)
const { lockSync } = require('proper-lockfile') as {
	lockSync: (file: string, options?: { realpath?: boolean }) => () => void
}

export const QUEUE_MODES = ['all', 'one-at-a-time'] as const
export const ABORT_POLICIES = ['clear-then-abort', 'abort-only'] as const

export type QueueMode = (typeof QUEUE_MODES)[number]
export type AbortPolicy = (typeof ABORT_POLICIES)[number]

export type RuntimeSettings = {
	steeringMode: QueueMode
	followUpMode: QueueMode
	abortPolicy: AbortPolicy
}

export type SettingsPatch = {
	steeringMode?: QueueMode
	followUpMode?: QueueMode
	abortPolicy?: AbortPolicy
}

const DEFAULTS: RuntimeSettings = {
	steeringMode: 'one-at-a-time',
	followUpMode: 'one-at-a-time',
	abortPolicy: 'clear-then-abort',
}

export function settingsPath(): string {
	return join(getRelaxAgentDir(), 'settings.json')
}

/** 全局文件里的三项。缺文件或非法值用默认。不含项目层。 */
export function readGlobalSettings(): RuntimeSettings {
	const raw = readObject(settingsPath())
	return {
		steeringMode: queueMode(raw.steeringMode) ?? DEFAULTS.steeringMode,
		followUpMode: queueMode(raw.followUpMode) ?? DEFAULTS.followUpMode,
		abortPolicy: abortPolicy(relaxOf(raw)?.abortPolicy) ?? DEFAULTS.abortPolicy,
	}
}

/**
 * 该工作区生效的中止策略。项目 `<cwd>/.pi/settings.json` 的 relax.abortPolicy 盖过全局，与基座合并方向一致。
 */
export function abortPolicyFor(cwd: string): AbortPolicy {
	const project = readObject(join(cwd, CONFIG_DIR_NAME, 'settings.json'))
	return abortPolicy(relaxOf(project)?.abortPolicy) ?? readGlobalSettings().abortPolicy
}

/** 只改传入的字段。其它顶层键和 relax 里已有的键保留。 */
export function patchSettings(patch: SettingsPatch): RuntimeSettings {
	const path = settingsPath()
	mkdirSync(dirname(path), { recursive: true })
	let release: (() => void) | undefined
	try {
		release = lockWithRetry(path)
		const current = readObject(path)
		if (patch.steeringMode) current.steeringMode = patch.steeringMode
		if (patch.followUpMode) current.followUpMode = patch.followUpMode
		if (patch.abortPolicy) {
			const relax = { ...relaxOf(current) }
			relax.abortPolicy = patch.abortPolicy
			current.relax = relax
		}
		writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`)
	} finally {
		release?.()
	}
	return readGlobalSettings()
}

function readObject(path: string): Record<string, unknown> {
	if (!existsSync(path)) return {}
	let parsed: unknown
	try {
		parsed = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
	} catch {
		throw new Error(`Invalid settings file: ${path}`)
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`Invalid settings file: ${path}`)
	}
	return parsed as Record<string, unknown>
}

function relaxOf(raw: Record<string, unknown>): Record<string, unknown> | undefined {
	const relax = raw.relax
	if (!relax || typeof relax !== 'object' || Array.isArray(relax)) return undefined
	return relax as Record<string, unknown>
}

function queueMode(value: unknown): QueueMode | undefined {
	return QUEUE_MODES.find((mode) => mode === value)
}

function abortPolicy(value: unknown): AbortPolicy | undefined {
	return ABORT_POLICIES.find((policy) => policy === value)
}

/** ponytail: 与基座 FileSettingsStorage 一样，锁冲突时同步空转。单进程几乎碰不到；跨进程最多等约 200ms。 */
function lockWithRetry(path: string): () => void {
	const maxAttempts = 10
	const delayMs = 20
	let last: unknown
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return lockSync(path, { realpath: false })
		} catch (error) {
			const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined
			if (code !== 'ELOCKED' || attempt === maxAttempts) throw error
			last = error
			const start = Date.now()
			while (Date.now() - start < delayMs) {
				// 同步等待，避免和基座的 lockSync 交错成两套异步队列。
			}
		}
	}
	throw last
}
