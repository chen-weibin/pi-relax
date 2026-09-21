import type { ComponentType } from 'react'

export type EmptyExtensionAction = 'welcome' | 'collapse'

export type EmptyExtensionHandler = (ctx: { closedTabId: string }) => EmptyExtensionAction

export type ExtensionTab = {
	id: string
	pluginId: string
	title: string
	reuseKey: string
	payload?: unknown
}

export type PluginOpenResult = {
	title: string
	reuseKey: string
	payload?: unknown
}

export type PluginRenderProps = {
	tab: ExtensionTab
}

export type ExtensionPlugin = {
	id: string
	title: string
	description: string
	icon: ComponentType
	/** 欢迎页 / 「+」菜单：创建一个默认 tab（Files 探索器 / 新终端） */
	open: () => PluginOpenResult
	render: ComponentType<PluginRenderProps>
	renderSide?: ComponentType<PluginRenderProps>
	onTabClosed?: (tab: ExtensionTab) => void
}

export type OpenTabInput = {
	pluginId: string
	title: string
	reuseKey: string
	payload?: unknown
}
