import { FileIcon, TerminalIcon } from '../icons'
import { useCommonStore } from '../store/common'
import { useCatalogStore } from '../store/catalog'
import { useLocalStore } from '../store/local'
import { pty } from './contracts/adapters/ptySocket'
import { resolveFileKind } from './plugins/files/fileKinds'
import { fileNameFromPath } from './plugins/files/open'
import { captureTerminalSnapshot, type SnapshotTab } from './snapshot'
import { useExtensionStore } from './store'
import type { ExtensionTab } from './types'

let currentKey: string | null = null
let currentCwd: string | null = null
let applying = false

export function currentExtensionCwd(): string | null {
	if (currentCwd) return currentCwd
	if (currentKey) return null
	return useCatalogStore.getState().defaultCwd
}

function persist() {
	if (applying || !currentKey || !currentCwd) return
	const live = useExtensionStore.getState()
	useLocalStore.getState().setExtension(
		currentKey,
		captureTerminalSnapshot(live.tabs, useCommonStore.getState().extensionOpen, currentCwd, live.activeTabId),
	)
}

function tabFromSnapshot(tab: SnapshotTab): ExtensionTab {
	if ('sessionId' in tab) {
		return {
			id: tab.id,
			pluginId: 'terminal',
			title: tab.title,
			reuseKey: tab.reuseKey,
			icon: TerminalIcon,
			payload: { sessionId: tab.sessionId },
		}
	}
	if ('path' in tab) {
		const title = fileNameFromPath(tab.path)
		return {
			id: tab.id,
			pluginId: 'files',
			title,
			reuseKey: tab.reuseKey,
			icon: resolveFileKind(tab.path).icon,
			payload: { kind: 'file', path: tab.path },
		}
	}
	return {
		id: tab.id,
		pluginId: 'files',
		title: '文件',
		reuseKey: 'explorer',
		icon: FileIcon,
		payload: { kind: 'explorer' },
	}
}

/** 把当前终端写回旧对话，再载入这条对话的终端。不关闭正在跑的进程。 */
export function setExtensionConversation(key: string, cwd: string | null) {
	if (!key) return
	if (currentKey === key) {
		if (cwd) currentCwd = cwd
		persist()
		return
	}
	persist()
	const saved = useLocalStore.getState().extensions[key]
	applying = true
	currentKey = key
	currentCwd = cwd || saved?.cwd || null
	useExtensionStore.getState().replaceTabs((saved?.tabs ?? []).map(tabFromSnapshot), saved?.activeTabId ?? null)
	useCommonStore.getState().setExtensionOpen(saved?.extensionOpen ?? false)
	applying = false
	if (currentCwd) {
		for (const tab of saved?.tabs ?? []) {
			if ('sessionId' in tab) void pty.create({ id: tab.sessionId, cwd: currentCwd })
		}
	}
	persist()
}

/** 草稿发出去之后，快照改挂到新会话 id 上，屏幕上的终端不动。 */
export function rekeyExtensionConversation(from: string, to: string) {
	if (!from || !to || from === to) return
	if (currentKey === from) persist()
	useLocalStore.getState().moveExtension(from, to)
	if (currentKey === from) currentKey = to
}

let listening = false
function listen() {
	if (listening) return
	listening = true
	useExtensionStore.subscribe(() => persist())
	let extensionOpen = useCommonStore.getState().extensionOpen
	useCommonStore.subscribe((state) => {
		if (state.extensionOpen === extensionOpen) return
		extensionOpen = state.extensionOpen
		persist()
	})
}

listen()
