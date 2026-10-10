import { execFile, spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const html = fileURLToPath(new URL('../app/server/test/html/index.html', import.meta.url))
const port = Number(process.env.PORT ?? 3001)

function listening() {
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
		const res = await fetch(`http://127.0.0.1:${port}/health`)
		return res.ok
	} catch {
		return false
	}
}

function openHtml() {
	return new Promise((resolve, reject) => {
		execFile('open', [html], (err) => (err ? reject(err) : resolve()))
	})
}

if (await listening()) {
	if (!(await healthy())) {
		console.error(`port ${port} is in use, but /health did not respond`)
		process.exit(1)
	}
	console.log(`server already listening on ${port}`)
	await openHtml()
	process.exit(0)
}

const child = spawn('pnpm', ['--filter', '@relax/server', 'dev'], {
	cwd: root,
	stdio: 'inherit',
})

let opened = false
let checking = false
const timer = setInterval(() => {
	if (opened || checking || child.exitCode !== null) return
	checking = true
	void healthy()
		.then(async (ok) => {
			if (!ok || opened) return
			opened = true
			clearInterval(timer)
			await openHtml()
		})
		.catch((err) => {
			console.error(err)
		})
		.finally(() => {
			checking = false
		})
}, 200)

child.on('exit', (code, signal) => {
	clearInterval(timer)
	if (!opened) process.exit(code ?? (signal ? 1 : 0))
})
