import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useCommonStore } from '../store'
import type {
	EmptyExtensionHandler,
	ExtensionPlugin,
	ExtensionTab,
	OpenTabInput,
} from './types'

type PluginLookup = (id: string) => ExtensionPlugin | undefined

let lookupPlugin: PluginLookup = () => undefined

export function bindPluginLookup(lookup: PluginLookup) {
	lookupPlugin = lookup
}

interface ExtensionState {
	tabs: ExtensionTab[]
	activeTabId: string | null
	emptyHandler: EmptyExtensionHandler
	setEmptyExtensionHandler: (handler: EmptyExtensionHandler) => void
	openTab: (input: OpenTabInput) => string
	openPlugin: (pluginId: string) => void
	activateTab: (tabId: string) => void
	closeTab: (tabId: string) => void
	updateTab: (
		tabId: string,
		patch: Partial<Pick<ExtensionTab, 'title' | 'icon' | 'reuseKey' | 'payload'>>,
	) => void
	replaceTabs: (tabs: ExtensionTab[], activeTabId: string | null) => void
}

const defaultEmptyHandler: EmptyExtensionHandler = () => 'collapse'

export const useExtensionStore = create<ExtensionState>()(
	immer((set, get) => ({
		tabs: [],
		activeTabId: null,
		emptyHandler: defaultEmptyHandler,
		setEmptyExtensionHandler: (handler) =>
			set((s) => {
				s.emptyHandler = handler
			}),
		openTab: (input) => {
			const existing = get().tabs.find(
				(tab) => tab.pluginId === input.pluginId && tab.reuseKey === input.reuseKey,
			)
			if (existing) {
				set((s) => {
					s.activeTabId = existing.id
				})
				return existing.id
			}
			const id = crypto.randomUUID()
			const tab: ExtensionTab = { id, ...input }
			set((s) => {
				s.tabs.push(tab)
				s.activeTabId = id
			})
			return id
		},
		openPlugin: (pluginId) => {
			const plugin = lookupPlugin(pluginId)
			if (!plugin) return
			const spec = plugin.open()
			get().openTab({ pluginId, ...spec })
		},
		activateTab: (tabId) =>
			set((s) => {
				if (s.tabs.some((tab) => tab.id === tabId)) s.activeTabId = tabId
			}),
		updateTab: (tabId, patch) =>
			set((s) => {
				const tab = s.tabs.find((item) => item.id === tabId)
				if (!tab) return
				if (patch.title !== undefined) tab.title = patch.title
				if (patch.icon !== undefined) tab.icon = patch.icon
				if (patch.reuseKey !== undefined) tab.reuseKey = patch.reuseKey
				if (patch.payload !== undefined) tab.payload = patch.payload
			}),
		replaceTabs: (tabs, activeTabId) =>
			set((s) => {
				s.tabs = tabs
				s.activeTabId = tabs.some((tab) => tab.id === activeTabId) ? activeTabId : (tabs[0]?.id ?? null)
			}),
		closeTab: (tabId) => {
			const { tabs, activeTabId, emptyHandler } = get()
			const index = tabs.findIndex((tab) => tab.id === tabId)
			if (index < 0) return
			const closed = tabs[index]
			if (!closed) return
			lookupPlugin(closed.pluginId)?.onTabClosed?.(closed)

			const remaining = tabs.filter((tab) => tab.id !== tabId)
			let nextActive = activeTabId
			if (activeTabId === tabId) {
				nextActive = remaining[index]?.id ?? remaining[index - 1]?.id ?? null
			}

			set((s) => {
				s.tabs = remaining
				s.activeTabId = nextActive
			})

			if (remaining.length === 0) {
				const action = emptyHandler({ closedTabId: tabId })
				if (action === 'collapse') {
					useCommonStore.getState().setExtensionOpen(false)
				}
			}
		},
	})),
)
