import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type ServerConfig = {
	home: string
	fsMaxBytes: number
	fsWatchDebounceMs: number
	fsWatchMax: number
	jsonBodyLimit: number
	ssePingMs: number
	ptyCols: number
	ptyRows: number
	ptyMax: number
	ptyReplayBytes: number
	ptyGraceMs: number
}

const DEFAULTS: ServerConfig = {
	home: join(homedir(), '.relax'),
	fsMaxBytes: 16 * 1024 * 1024,
	fsWatchDebounceMs: 600,
	fsWatchMax: 16,
	jsonBodyLimit: 1024 * 1024,
	ssePingMs: 15_000,
	ptyCols: 80,
	ptyRows: 24,
	ptyMax: 16,
	ptyReplayBytes: 100 * 1024,
	ptyGraceMs: 15_000,
}

export function serverConfigPath(): string {
	return join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'config.json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveInt(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return fallback
	return value
}

function expandHome(value: string): string {
	if (value === '~') return homedir()
	if (value.startsWith('~/') || value.startsWith('~\\')) return join(homedir(), value.slice(2))
	return value
}

function homeOf(value: unknown): string {
	if (typeof value !== 'string' || value.trim() === '') return DEFAULTS.home
	return expandHome(value)
}

/** 缺文件、缺键、类型不对的字段用代码默认值。JSON 解析失败则抛错。 */
export function loadServerConfig(file: string): ServerConfig {
	if (!existsSync(file)) return { ...DEFAULTS }
	let parsed: unknown
	try {
		parsed = JSON.parse(readFileSync(file, 'utf8'))
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		throw new Error(`无法解析 ${file}：${message}`)
	}
	const record = isRecord(parsed) ? parsed : {}
	return {
		home: homeOf(record.home),
		fsMaxBytes: positiveInt(record.fsMaxBytes, DEFAULTS.fsMaxBytes),
		fsWatchDebounceMs: positiveInt(record.fsWatchDebounceMs, DEFAULTS.fsWatchDebounceMs),
		fsWatchMax: positiveInt(record.fsWatchMax, DEFAULTS.fsWatchMax),
		jsonBodyLimit: positiveInt(record.jsonBodyLimit, DEFAULTS.jsonBodyLimit),
		ssePingMs: positiveInt(record.ssePingMs, DEFAULTS.ssePingMs),
		ptyCols: positiveInt(record.ptyCols, DEFAULTS.ptyCols),
		ptyRows: positiveInt(record.ptyRows, DEFAULTS.ptyRows),
		ptyMax: positiveInt(record.ptyMax, DEFAULTS.ptyMax),
		ptyReplayBytes: positiveInt(record.ptyReplayBytes, DEFAULTS.ptyReplayBytes),
		ptyGraceMs: positiveInt(record.ptyGraceMs, DEFAULTS.ptyGraceMs),
	}
}

export const serverConfig: ServerConfig = loadServerConfig(serverConfigPath())
