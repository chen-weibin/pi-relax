import { commands, type CommandDisposable } from './commands'
import { filesPlugin } from './plugins/files'
import { terminalPlugin } from './plugins/terminal'
import { bindPluginLookup } from './store'
import type { ExtensionPlugin } from './types'

export const extensionPlugins: ExtensionPlugin[] = [filesPlugin, terminalPlugin]

export function getExtensionPlugin(id: string) {
	return extensionPlugins.find((plugin) => plugin.id === id)
}

bindPluginLookup(getExtensionPlugin)

function isCommandDisposable(
	value: CommandDisposable | readonly CommandDisposable[],
): value is CommandDisposable {
	return !Array.isArray(value)
}

// 留着 activate 返回的句柄。命令本身在总线上，句柄在这里才不会被当成临时值丢掉。
const commandDisposables: CommandDisposable[] = []

for (const plugin of extensionPlugins) {
	const registered = plugin.activate?.({ commands })
	if (!registered) continue
	if (isCommandDisposable(registered)) commandDisposables.push(registered)
	else commandDisposables.push(...registered)
}
