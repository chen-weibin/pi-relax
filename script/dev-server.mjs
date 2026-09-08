import { spawn } from "node:child_process"

const procs = [
	spawn("pnpm", ["--filter", "relax-agent", "dev:build"], { stdio: "inherit" }),
	spawn("pnpm", ["--filter", "@relax/server", "dev"], { stdio: "inherit" }),
]

const shutdown = () => {
	for (const p of procs) {
		if (!p.killed) p.kill("SIGTERM")
	}
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

for (const p of procs) {
	p.on("exit", (code) => {
		shutdown()
		process.exit(code ?? 0)
	})
}

// ponytail: spawn-and-kill 模式,任一子进程退出即整体退出。
// tsx watch 监听 agent/dist 变化自动重启 server,无需在此转发。
