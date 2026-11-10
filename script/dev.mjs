import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const serverPort = Number(process.env.PORT ?? 3001)
const webPort = Number(process.env.WEB_PORT ?? 5173)
const healthTimeoutMs = 60_000
/** 收尾时等进程组退干净的上限。超了就 SIGKILL。 */
const drainTimeoutMs = 3_000

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

/** 子进程用 detached 起的，自己是一个会话，pid 就是进程组 id。 */
function groups() {
	return [...owned].map((child) => child.pid).filter((pid) => typeof pid === 'number')
}

/** 进程组里还有没有活人。 */
function groupAlive(pgid) {
	try {
		process.kill(-pgid, 0)
		return true
	} catch {
		return false
	}
}

/** 砍掉整个进程组。组已经没了就是 ESRCH，不用补刀。 */
function killGroup(pgid, signal) {
	try {
		process.kill(-pgid, signal)
	} catch (err) {
		if (err?.code === 'EPERM') {
			try {
				process.kill(pgid, signal)
			} catch {}
		}
	}
}

function stop(code) {
	// 第二次 Ctrl+C：不再等，直接砍干净。
	if (stopping) {
		for (const pgid of groups()) killGroup(pgid, 'SIGKILL')
		process.exit(code || 1)
	}
	stopping = true
	const pgids = groups()
	if (pgids.length === 0) process.exit(code)

	for (const pgid of pgids) killGroup(pgid, 'SIGTERM')

	// leader 退出不代表孙子也退了。等组里真的空了才算退干净。
	let poll
	let deadline
	const done = () => {
		clearInterval(poll)
		clearTimeout(deadline)
		process.exit(code)
	}
	poll = setInterval(() => {
		if (pgids.some(groupAlive)) return
		done()
	}, 100)
	deadline = setTimeout(() => {
		for (const pgid of pgids) killGroup(pgid, 'SIGKILL')
		done()
	}, drainTimeoutMs)
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

// SIGHUP 也要接。终端一关、SSH 一断就是它，不接的话这里直接被默认行为杀掉，
// stop() 不会跑，detached 起的子进程会永远留着占着端口。
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
process.on('SIGHUP', () => stop(0))

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
