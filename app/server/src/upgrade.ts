import type { IncomingMessage, Server } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer } from 'ws'

const mounted = new WeakMap<Server, WebSocketServer[]>()

/**
 * 多个 WebSocketServer 不能各自监听同一个 HTTP 的 upgrade。
 * `ws` 对路径不匹配的请求会直接回 400，把另一条路径的握手拆掉。
 */
export function mountWebSocket(server: Server, wss: WebSocketServer) {
	let list = mounted.get(server)
	if (!list) {
		const created: WebSocketServer[] = []
		list = created
		mounted.set(server, created)
		server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
			const match = created.find((item) => item.shouldHandle(req))
			if (!match) {
				socket.destroy()
				return
			}
			match.handleUpgrade(req, socket, head, (ws) => {
				match.emit('connection', ws, req)
			})
		})
	}
	list.push(wss)
}
