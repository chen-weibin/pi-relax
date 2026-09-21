import { filesPlugin } from './plugins/files'
import { terminalPlugin } from './plugins/terminal'
import { bindPluginLookup } from './store'
import type { ExtensionPlugin } from './types'

export const extensionPlugins: ExtensionPlugin[] = [filesPlugin, terminalPlugin]

export function getExtensionPlugin(id: string) {
	return extensionPlugins.find((plugin) => plugin.id === id)
}

bindPluginLookup(getExtensionPlugin)
