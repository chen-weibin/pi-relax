import type { SettingsManager } from '@earendil-works/pi-coding-agent'
import { bashWithDescription } from './bash.js'

/**
 * 传给 createAgentSession 的 customTools。
 *
 * 同名工具会覆盖内建的：基座把 customTools 和扩展注册的工具合成一份，
 * 后写的盖掉先写的（agent-session.ts 里的 definitionRegistry 和 toolRegistry）。
 * 这里的 bash 因此替掉内建 bash，模型侧看到的是多一个 description 的版本。
 */
export function customTools(cwd: string, settingsManager: SettingsManager) {
	return [
		bashWithDescription(cwd, {
			// 内建 bash 是基座用这两个设置建的。自己建的时候不传，用户配的 shell 前缀和路径就丢了。
			commandPrefix: settingsManager.getShellCommandPrefix(),
			shellPath: settingsManager.getShellPath(),
		}),
	]
}
