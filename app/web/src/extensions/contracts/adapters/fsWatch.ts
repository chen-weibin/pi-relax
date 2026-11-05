import { fsWebSocketUrl, parseFsMessage, type FsChange } from '../../../api/fs/frames'
import { config } from '../../../config'

export function watchDirectory(cwd: string, onChange: (changes: FsChange[]) => void): () => void {
	const socket = new WebSocket(fsWebSocketUrl(config.apiBaseUrl))
	const send = (type: 'watch' | 'unwatch') => {
		if (socket.readyState !== WebSocket.OPEN) return
		socket.send(JSON.stringify({ type, path: cwd }))
	}
	socket.addEventListener('open', () => send('watch'))
	socket.addEventListener('message', (event) => {
		if (typeof event.data !== 'string') return
		const message = parseFsMessage(event.data)
		if (message?.type === 'change') onChange(message.changes)
	})
	return () => {
		send('unwatch')
		socket.close()
	}
}
