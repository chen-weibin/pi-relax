import type { Server } from 'node:http'
import { realpath, stat } from 'node:fs/promises'
import { watch, type FSWatcher } from 'chokidar'
import { WebSocketServer, type WebSocket } from 'ws'
import { serverConfig } from '../config/server.js'
import { HttpError } from '../utils/errors.js'
import { requireAbsolutePath } from './ops.js'

type FsEvent = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
type RootWatch = {
	real: string
	watcher: FSWatcher
	clients: Set<WebSocket>
	pending: Map<string, FsEvent>
	timer: ReturnType<typeof setTimeout> | null
}

const EVENTS = new Set<FsEvent>(['add', 'change', 'unlink', 'addDir', 'unlinkDir'])
const roots = new Map<string, RootWatch>()
const clientRoots = new WeakMap<WebSocket, Map<string, string>>()

function send(ws: WebSocket, payload: unknown) {
	if (ws.readyState !== ws.OPEN) return
	ws.send(JSON.stringify(payload))
}

function fail(ws: WebSocket, path: string, err: unknown) {
	if (err instanceof HttpError) {
		send(ws, { type: 'error', path, error: { code: err.code, message: err.message } })
		return
	}
	console.error(err)
	send(ws, { type: 'error', path, error: { code: 'INTERNAL', message: '监听失败' } })
}

function flush(key: string) {
	const root = roots.get(key)
	if (!root) return
	root.timer = null
	if (root.pending.size === 0) return
	const raw = [...root.pending.entries()]
	root.pending.clear()
	for (const ws of root.clients) {
		const subscribed = clientRoots.get(ws)?.get(key)
		if (!subscribed) continue
		const changes = raw.map(([filePath, event]) => ({ event, path: fromReal(subscribed, root.real, filePath) }))
		send(ws, { type: 'change', path: subscribed, changes })
	}
}

function schedule(key: string) {
	const root = roots.get(key)
	if (!root || root.timer) return
	root.timer = setTimeout(() => flush(key), serverConfig.fsWatchDebounceMs)
}

function fromReal(subscribed: string, real: string, filePath: string): string {
	if (filePath === real) return subscribed
	const prefix = real.endsWith('/') ? real : `${real}/`
	if (filePath.startsWith(prefix)) return subscribed.replace(/\/$/, '') + '/' + filePath.slice(prefix.length)
	return filePath
}

function dropClient(ws: WebSocket, key: string) {
	const root = roots.get(key)
	if (!root) return
	root.clients.delete(ws)
	if (root.clients.size > 0) return
	if (root.timer) clearTimeout(root.timer)
	void root.watcher.close()
	roots.delete(key)
}

function dropAll(ws: WebSocket) {
	const mine = clientRoots.get(ws)
	if (!mine) return
	for (const key of [...mine.keys()]) dropClient(ws, key)
	clientRoots.delete(ws)
}

async function watchRoot(ws: WebSocket, path: string) {
	const absolute = requireAbsolutePath(path)
	let info
	try {
		info = await stat(absolute)
	} catch (err) {
		const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
		if (code === 'ENOENT') throw new HttpError(404, 'NOT_FOUND', `路径不存在：${absolute}`)
		throw new HttpError(400, 'BAD_REQUEST', `无法访问：${absolute}`)
	}
	if (!info.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', `不是目录：${absolute}`)
	const real = await realpath(absolute)
	const key = `${info.dev}:${info.ino}`
	let mine = clientRoots.get(ws)
	if (!mine) {
		mine = new Map()
		clientRoots.set(ws, mine)
	}
	if (mine.has(key)) {
		send(ws, { type: 'watching', path: absolute })
		return
	}
	let root = roots.get(key)
	if (!root) {
		const max = serverConfig.fsWatchMax
		if (roots.size >= max) {
			throw new HttpError(400, 'BAD_REQUEST', `根目录监听已有 ${roots.size} 路，达到上限 ${max}`)
		}
		const pending = new Map<string, FsEvent>()
		const watcher = watch(absolute, { ignoreInitial: true })
		const ready = new Promise<void>((resolve, reject) => {
			watcher.once('ready', () => resolve())
			watcher.once('error', (err) => reject(err instanceof Error ? err : new Error(String(err))))
		})
		root = { real, watcher, clients: new Set(), pending, timer: null }
		watcher.on('all', (event, filePath) => {
			if (!filePath || !EVENTS.has(event as FsEvent)) return
			pending.set(filePath, event as FsEvent)
			schedule(key)
		})
		watcher.on('error', (err) => {
			for (const client of [...(roots.get(key)?.clients ?? [])]) fail(client, absolute, err)
		})
		try {
			await ready
		} catch (err) {
			await watcher.close()
			throw err
		}
		roots.set(key, root)
		if (pending.size > 0) schedule(key)
	}
	root.clients.add(ws)
	mine.set(key, absolute)
	send(ws, { type: 'watching', path: absolute })
}

function unwatch(ws: WebSocket, path: string) {
	const absolute = requireAbsolutePath(path)
	const mine = clientRoots.get(ws)
	if (!mine) return
	for (const [key, subscribed] of [...mine.entries()]) {
		if (subscribed !== absolute) continue
		mine.delete(key)
		dropClient(ws, key)
	}
}

export function attachFs(server: Server) {
	const wss = new WebSocketServer({ server, path: '/ws/fs' })
	wss.on('connection', (ws) => {
		ws.on('message', (data) => {
			let message: { type?: unknown; path?: unknown }
			try {
				message = JSON.parse(String(data)) as { type?: unknown; path?: unknown }
			} catch {
				fail(ws, '', new HttpError(400, 'BAD_REQUEST', '消息不是合法 JSON'))
				return
			}
			const path = typeof message.path === 'string' ? message.path : ''
			if (message.type !== 'watch' && message.type !== 'unwatch') {
				fail(ws, path, new HttpError(400, 'BAD_REQUEST', 'type 只能是 watch 或 unwatch'))
				return
			}
			const run = message.type === 'watch' ? watchRoot(ws, path) : Promise.resolve().then(() => unwatch(ws, path))
			void run.catch((err) => fail(ws, path, err))
		})
		ws.on('close', () => dropAll(ws))
	})
	return wss
}

/** 测试结束时关掉监听，避免描述符留到下一个用例。 */
export async function closeFsWatchers(): Promise<void> {
	const all = [...roots.values()]
	roots.clear()
	await Promise.all(all.map((root) => root.watcher.close()))
}
