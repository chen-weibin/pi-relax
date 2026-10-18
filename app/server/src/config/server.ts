import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type FsConfig = {
	maxBytes: number
	watchDebounceMs: number
	watchMax: number
}

export type HttpConfig = {
	jsonBodyLimit: number
	ssePingMs: number
}

export type PtyConfig = {
	cols: number
	rows: number
	max: number
	replayBytes: number
	graceMs: number
}

export type ServerConfig = {
	home: string
	fs: FsConfig
	http: HttpConfig
	pty: PtyConfig
}

const DEFAULTS: ServerConfig = {
	home: join(homedir(), '.relax'),
	fs: {
		maxBytes: 16 * 1024 * 1024,
		watchDebounceMs: 600,
		watchMax: 16,
	},
	http: {
		jsonBodyLimit: 1024 * 1024,
		ssePingMs: 15_000,
	},
	pty: {
		cols: 80,
		rows: 24,
		max: 16,
		replayBytes: 100 * 1024,
		graceMs: 15_000,
	},
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

function section(record: Record<string, unknown>, key: string): Record<string, unknown> {
	const value = record[key]
	return isRecord(value) ? value : {}
}

function copyDefaults(): ServerConfig {
	return {
		home: DEFAULTS.home,
		fs: { ...DEFAULTS.fs },
		http: { ...DEFAULTS.http },
		pty: { ...DEFAULTS.pty },
	}
}

/** 缺文件、缺组、缺键、类型不对的字段用代码默认值。JSON 解析失败则抛错。 */
export function loadServerConfig(file: string): ServerConfig {
	if (!existsSync(file)) return copyDefaults()
	let parsed: unknown
	try {
		parsed = JSON.parse(readFileSync(file, 'utf8'))
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		throw new Error(`无法解析 ${file}：${message}`)
	}
	const record = isRecord(parsed) ? parsed : {}
	const fs = section(record, 'fs')
	const http = section(record, 'http')
	const pty = section(record, 'pty')
	return {
		home: homeOf(record.home),
		fs: {
			maxBytes: positiveInt(fs.maxBytes, DEFAULTS.fs.maxBytes),
			watchDebounceMs: positiveInt(fs.watchDebounceMs, DEFAULTS.fs.watchDebounceMs),
			watchMax: positiveInt(fs.watchMax, DEFAULTS.fs.watchMax),
		},
		http: {
			jsonBodyLimit: positiveInt(http.jsonBodyLimit, DEFAULTS.http.jsonBodyLimit),
			ssePingMs: positiveInt(http.ssePingMs, DEFAULTS.http.ssePingMs),
		},
		pty: {
			cols: positiveInt(pty.cols, DEFAULTS.pty.cols),
			rows: positiveInt(pty.rows, DEFAULTS.pty.rows),
			max: positiveInt(pty.max, DEFAULTS.pty.max),
			replayBytes: positiveInt(pty.replayBytes, DEFAULTS.pty.replayBytes),
			graceMs: positiveInt(pty.graceMs, DEFAULTS.pty.graceMs),
		},
	}
}

export const serverConfig: ServerConfig = loadServerConfig(serverConfigPath())
