import { randomUUID } from 'node:crypto'
import { chmodSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { spawn, type IPty } from 'node-pty'
import type { RawData, WebSocket } from 'ws'
import { serverConfig } from '../config/server.js'
import { HttpError } from '../utils/errors.js'
import { requireAbsolutePath } from '../fs/ops.js'

const CLOSE_BAD = 4400
const CLOSE_GONE = 4404
const CLOSE_FULL = 4429
const CLOSE_EXIT = 4000
const CLOSE_REPLACED = 4010

type Session = {
	id: string
	pty: IPty | null
	replay: string
	socket: WebSocket | null
	/** 为 true 时输出才写进当前套接字。握手期间先攒进 replay。 */
	live: boolean
	grace: ReturnType<typeof setTimeout> | null
	done: boolean
}

const sessions = new Map<string, Session>()

const require = createRequire(import.meta.url)

/** pnpm 装出来的 spawn-helper 可能没有执行位，posix_spawnp 会失败。 */
function ensureSpawnHelper() {
	if (process.platform === 'win32') return
	const root = dirname(require.resolve('node-pty/package.json'))
	const helper = join(root, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper')
	try {
		chmodSync(helper, 0o755)
	} catch {
		// 真正起不来时，spawn 会带上原因
	}
}

export class PtyClose extends Error {
	constructor(
		readonly code: number,
		message: string,
	) {
		super(message)
		this.name = 'PtyClose'
	}
}

function clip(message: string): string {
	const buf = Buffer.from(message)
	if (buf.length <= 123) return message
	return buf.subarray(0, 123).toString('utf8').replace(/\uFFFD$/, '')
}

function fail(ws: WebSocket, message: string) {
	if (ws.readyState !== ws.OPEN) return
	ws.send(JSON.stringify({ type: 'error', error: { code: 'BAD_REQUEST', message } }))
}

/** ponytail: 按字节从尾部截。切在多字节字符中间时，那个字符变成 U+FFFD。升级路径是按码点回退到完整字符。 */
function trimReplay(text: string, maxBytes: number): string {
	const buf = Buffer.from(text)
	if (buf.length <= maxBytes) return text
	return buf.subarray(buf.length - maxBytes).toString('utf8')
}

function shellFile(): string {
	const shell = process.env.SHELL
	if (typeof shell === 'string' && shell !== '') return shell
	return '/bin/zsh'
}

function shellEnv(): Record<string, string> {
	const env: Record<string, string> = {}
	for (const [key, value] of Object.entries(process.env)) {
		if (typeof value === 'string') env[key] = value
	}
	if (!env.TERM) env.TERM = 'xterm-256color'
	return env
}

function queryDim(name: string, raw: string | null): number | undefined {
	if (raw == null || raw === '') return undefined
	if (!/^[1-9]\d*$/.test(raw)) throw new PtyClose(CLOSE_BAD, `${name} 必须是正整数：${raw}`)
	return Number(raw)
}

function sizeOf(cols: number | undefined, rows: number | undefined): { cols: number; rows: number } {
	return {
		cols: cols ?? serverConfig.ptyCols,
		rows: rows ?? serverConfig.ptyRows,
	}
}

async function resolveCwd(cwd: string | null): Promise<string> {
	const absolute = requireAbsolutePath(cwd)
	let info
	try {
		info = await stat(absolute)
	} catch (err) {
		const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
		if (code === 'ENOENT') throw new HttpError(404, 'NOT_FOUND', `路径不存在：${absolute}`)
		throw new HttpError(400, 'BAD_REQUEST', `无法访问：${absolute}`)
	}
	if (!info.isDirectory()) throw new HttpError(404, 'NOT_FOUND', `不是目录：${absolute}`)
	return absolute
}

function bytesOf(data: RawData): Buffer {
	if (Buffer.isBuffer(data)) return data
	if (Array.isArray(data)) return Buffer.concat(data)
	return Buffer.from(data)
}

function clearGrace(session: Session) {
	if (!session.grace) return
	clearTimeout(session.grace)
	session.grace = null
}

function killPty(session: Session) {
	if (!session.pty) return
	try {
		session.pty.kill('SIGKILL')
	} catch {
		// 进程已经没了
	}
}

function userClose(session: Session) {
	if (session.done) return
	session.done = true
	session.live = false
	clearGrace(session)
	const sock = session.socket
	session.socket = null
	sessions.delete(session.id)
	killPty(session)
	sock?.close(1000, 'closed')
}

function reap(session: Session) {
	if (session.done) return
	session.done = true
	session.live = false
	clearGrace(session)
	session.socket = null
	sessions.delete(session.id)
	killPty(session)
}

function pushOutput(session: Session, chunk: string) {
	session.replay = trimReplay(session.replay + chunk, serverConfig.ptyReplayBytes)
	const sock = session.socket
	if (!session.live || !sock || sock.readyState !== sock.OPEN) return
	sock.send(Buffer.from(chunk))
}

function attach(session: Session, ws: WebSocket, resume: boolean) {
	const previous = session.socket
	session.live = false
	session.socket = ws
	clearGrace(session)
	if (previous && previous !== ws && previous.readyState === previous.OPEN) {
		previous.close(CLOSE_REPLACED, 'replaced')
	}
	const sent = session.replay
	if (resume) {
		ws.send(JSON.stringify({ type: 'ready', id: session.id, replay: sent }))
	} else {
		ws.send(JSON.stringify({ type: 'ready', id: session.id }))
		if (sent) ws.send(Buffer.from(sent))
	}
	session.live = true
	if (session.replay.startsWith(sent) && session.replay.length > sent.length) {
		ws.send(Buffer.from(session.replay.slice(sent.length)))
	}
}

function bind(session: Session, ws: WebSocket) {
	ws.on('message', (data, isBinary) => {
		if (session.done || session.socket !== ws || !session.pty) return
		if (isBinary) {
			session.pty.write(bytesOf(data))
			return
		}
		let message: { type?: unknown; cols?: unknown; rows?: unknown }
		try {
			message = JSON.parse(String(data)) as { type?: unknown; cols?: unknown; rows?: unknown }
		} catch {
			fail(ws, '消息不是合法 JSON')
			return
		}
		if (message.type === 'close') {
			userClose(session)
			return
		}
		if (message.type !== 'resize') {
			fail(ws, 'type 只能是 resize 或 close')
			return
		}
		if (typeof message.cols !== 'number' || !Number.isInteger(message.cols) || message.cols <= 0) {
			fail(ws, 'cols 必须是正整数')
			return
		}
		if (typeof message.rows !== 'number' || !Number.isInteger(message.rows) || message.rows <= 0) {
			fail(ws, 'rows 必须是正整数')
			return
		}
		try {
			session.pty.resize(message.cols, message.rows)
		} catch (err) {
			const messageText = err instanceof Error ? err.message : String(err)
			fail(ws, `无法调整大小：${messageText}`)
		}
	})
	ws.on('close', () => {
		if (session.socket !== ws) return
		session.socket = null
		session.live = false
		if (session.done) return
		session.grace = setTimeout(() => {
			session.grace = null
			reap(session)
		}, serverConfig.ptyGraceMs)
	})
}

function watchExit(session: Session, proc: IPty) {
	proc.onExit(({ exitCode }) => {
		if (session.done) return
		session.done = true
		session.live = false
		clearGrace(session)
		const sock = session.socket
		session.socket = null
		sessions.delete(session.id)
		sock?.close(CLOSE_EXIT, clip(`exit ${exitCode}`))
	})
	proc.onData((chunk) => pushOutput(session, chunk))
}

export async function acceptPty(ws: WebSocket, url: URL): Promise<void> {
	const id = url.searchParams.get('id')
	const cols = queryDim('cols', url.searchParams.get('cols'))
	const rows = queryDim('rows', url.searchParams.get('rows'))
	if (id) {
		const session = sessions.get(id)
		if (!session || session.done || !session.pty) {
			throw new PtyClose(CLOSE_GONE, `终端不存在或已结束：${id}`)
		}
		bind(session, ws)
		attach(session, ws, true)
		const size = sizeOf(cols, rows)
		try {
			session.pty.resize(size.cols, size.rows)
		} catch {
			// 进程刚好退出时，onExit 会关连接
		}
		return
	}
	if (sessions.size >= serverConfig.ptyMax) {
		throw new PtyClose(CLOSE_FULL, `终端已有 ${sessions.size} 路，达到上限 ${serverConfig.ptyMax}`)
	}
	const session: Session = {
		id: randomUUID(),
		pty: null,
		replay: '',
		socket: null,
		live: false,
		grace: null,
		done: false,
	}
	sessions.set(session.id, session)
	const size = sizeOf(cols, rows)
	try {
		const cwd = await resolveCwd(url.searchParams.get('cwd'))
		if (session.done || ws.readyState !== ws.OPEN) {
			reap(session)
			return
		}
		ensureSpawnHelper()
		const proc = spawn(shellFile(), [], {
			name: 'xterm-256color',
			cols: size.cols,
			rows: size.rows,
			cwd,
			env: shellEnv(),
		})
		session.pty = proc
		watchExit(session, proc)
		if (ws.readyState !== ws.OPEN) {
			reap(session)
			return
		}
		bind(session, ws)
		attach(session, ws, false)
	} catch (err) {
		if (!session.done) {
			session.done = true
			sessions.delete(session.id)
			killPty(session)
		}
		if (err instanceof HttpError || err instanceof PtyClose) throw err
		const message = err instanceof Error ? err.message : String(err)
		throw new PtyClose(1011, `无法启动 shell：${message}`)
	}
}

export function closeAllPty(): void {
	for (const session of [...sessions.values()]) reap(session)
}

export function ptyCloseCode(err: unknown): { code: number; message: string } {
	if (err instanceof PtyClose) return { code: err.code, message: err.message }
	if (err instanceof HttpError) {
		const code = err.status === 404 ? CLOSE_GONE : CLOSE_BAD
		return { code, message: err.message }
	}
	const message = err instanceof Error ? err.message : String(err)
	return { code: 1011, message }
}

export function clipPtyReason(message: string): string {
	return clip(message)
}
