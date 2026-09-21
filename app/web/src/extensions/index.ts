export type {
	EmptyExtensionAction,
	EmptyExtensionHandler,
	ExtensionPlugin,
	ExtensionTab,
	OpenTabInput,
	PluginOpenResult,
	PluginRenderProps,
} from './types'
export { useExtensionStore } from './store'
export { extensionPlugins, getExtensionPlugin } from './registry'
export { Extension } from './shell/Extension'
