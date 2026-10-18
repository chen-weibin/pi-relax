import type { Server } from 'node:http'
import { WebSocketServer } from 'ws'
import { mountWebSocket } from '../upgrade.js'
import { acceptPty, clipPtyReason, ptyCloseCode } from './sessions.js'

export function attachPty(server: Server) {
	const wss = new WebSocketServer({ noServer: true, path: '/ws/pty' })
	mountWebSocket(server, wss)
	wss.on('connection', (ws, req) => {
		const url = new URL(req.url ?? '/ws/pty', 'http://127.0.0.1')
		void acceptPty(ws, url).catch((err) => {
			const { code, message } = ptyCloseCode(err)
			if (code === 1011) console.error(err)
			if (ws.readyState === ws.OPEN) ws.close(code, clipPtyReason(message))
		})
	})
	return wss
}
