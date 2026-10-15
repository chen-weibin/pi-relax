import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const serverPort = Number(process.env.PORT ?? 3001)
const webPort = Number(process.env.WEB_PORT ?? 5173)
const healthTimeoutMs = 60_000

function listening(port) {
	return new Promise((resolve) => {
		const socket = createConnection({ port, host: '127.0.0.1' })
		const done = (ok) => {
			socket.removeAllListeners()
			socket.destroy()
			resolve(ok)
		}
		socket.once('connect', () => done(true))
		socket.once('error', () => done(false))
	})
}

async function healthy() {
	try {
		const res = await fetch(`http://127.0.0.1:${serverPort}/health`)
		return res.ok
	} catch {
		return false
	}
}

const owned = new Set()
let stopping = false

function killGroup(child, signal) {
	try {
		process.kill(-child.pid, signal)
	} catch {
		child.kill(signal)
	}
}

function stop(code) {
	if (stopping) return
	stopping = true
	const pending = [...owned].filter((child) => child.exitCode === null)
	if (pending.length === 0) process.exit(code)
	const timer = setTimeout(() => {
		for (const child of pending) killGroup(child, 'SIGKILL')
	}, 2000)
	let left = pending.length
	for (const child of pending) {
		killGroup(child, 'SIGTERM')
		child.on('exit', () => {
			left -= 1
			if (left > 0) return
			clearTimeout(timer)
			process.exit(code)
		})
	}
}

function run(script) {
	const child = spawn('pnpm', ['run', script], {
		cwd: root,
		stdio: 'inherit',
		detached: true,
	})
	owned.add(child)
	child.on('exit', (code, signal) => {
		if (stopping) return
		stop(code ?? (signal ? 1 : 0))
	})
	return child
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

if (await listening(serverPort)) {
	if (!(await healthy())) {
		console.error(`port ${serverPort} is in use, but /health did not respond`)
		process.exit(1)
	}
	console.log(`server already listening on ${serverPort}`)
} else {
	const server = run('dev:server')
	const started = Date.now()
	while (!stopping && !(await healthy())) {
		if (server.exitCode !== null) break
		if (Date.now() - started > healthTimeoutMs) {
			console.error(`server did not become healthy within ${healthTimeoutMs}ms`)
			stop(1)
			break
		}
		await new Promise((resolve) => setTimeout(resolve, 200))
	}
}

if (!stopping) {
	if (await listening(webPort)) console.log(`web already listening on ${webPort}`)
	else run('dev:web')
}

if (!stopping && owned.size === 0) process.exit(0)
