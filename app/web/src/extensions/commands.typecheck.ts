/** 只给 tsc 钉类型，应用入口不要 import 这个文件。 */
import { commands, executeCommand, executeCommandSync } from './commands.ts'

void executeCommand('terminal.list')
void executeCommandSync('terminal.list')
void executeCommand('terminal.open')
void executeCommand('terminal.open', { cwd: '/tmp' })
void executeCommand('terminal.exec', { sessionId: 's', command: 'ls' })

declare module './commands.ts' {
	interface CommandMap {
		'typecheck.sync': { args: void; result: number; sync: true }
	}
}

// @ts-expect-error 同步命令不能用 executeCommandSync 调用异步命令
void executeCommandSync('terminal.open')

// @ts-expect-error terminal.exec 必须带 sessionId 和 command
void executeCommand('terminal.exec')

// @ts-expect-error 未登记的命令 id
void executeCommand('missing.command')

// @ts-expect-error 同步命令的处理函数不能返回 Promise
commands.registerCommand('typecheck.sync', async () => 1)
