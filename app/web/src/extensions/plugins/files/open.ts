import type { PluginOpenResult } from '../../types'
import { useExtensionStore } from '../../store'
import { resolveFileKind } from './fileKinds'

export type FilesExplorerPayload = { kind: 'explorer' }
export type FilesFilePayload = { kind: 'file'; path: string }
export type FilesPayload = FilesExplorerPayload | FilesFilePayload

export function isFilesPayload(value: unknown): value is FilesPayload {
	if (!value || typeof value !== 'object') return false
	const kind = (value as { kind?: unknown }).kind
	if (kind === 'explorer') return true
	if (kind === 'file' && typeof (value as { path?: unknown }).path === 'string') return true
	return false
}

export function filesExplorerOpen(): PluginOpenResult {
	const existing = useExtensionStore.getState().tabs.find((tab) => tab.pluginId === 'files')
	if (existing) {
		return {
			title: existing.title,
			reuseKey: existing.reuseKey,
			icon: existing.icon,
			payload: existing.payload,
		}
	}
	return {
		title: '文件',
		reuseKey: 'explorer',
		payload: { kind: 'explorer' } satisfies FilesExplorerPayload,
	}
}

export function fileNameFromPath(path: string) {
	return path.split('/').filter(Boolean).pop() ?? path
}

export function fileReuseKey(path: string) {
	return `file:${path}`
}

export function selectFile(path: string) {
	const store = useExtensionStore.getState()
	const reuseKey = fileReuseKey(path)
	const existing = store.tabs.find((tab) => tab.pluginId === 'files' && tab.reuseKey === reuseKey)
	if (existing) {
		store.activateTab(existing.id)
		return existing.id
	}

	const kind = resolveFileKind(path)
	const title = fileNameFromPath(path)
	const payload = { kind: 'file', path } satisfies FilesFilePayload
	const active = store.tabs.find((tab) => tab.id === store.activeTabId)
	if (active?.pluginId === 'files' && active.reuseKey === 'explorer') {
		store.updateTab(active.id, {
			title,
			icon: kind.icon,
			reuseKey,
			payload,
		})
		return active.id
	}

	return store.openTab({
		pluginId: 'files',
		title,
		reuseKey,
		icon: kind.icon,
		payload,
	})
}

function fileTabPath(tab: { pluginId: string; payload?: unknown }): string | null {
	if (tab.pluginId !== 'files' || !isFilesPayload(tab.payload) || tab.payload.kind !== 'file') return null
	return tab.payload.path
}

function remapFilePath(path: string, from: string, to: string): string | null {
	if (path === from) return to
	if (path.startsWith(`${from}/`)) return to + path.slice(from.length)
	return null
}

export function remapOpenFiles(from: string, to: string) {
	const store = useExtensionStore.getState()
	for (const tab of store.tabs) {
		const path = fileTabPath(tab)
		if (!path) continue
		const next = remapFilePath(path, from, to)
		if (!next) continue
		const kind = resolveFileKind(next)
		store.updateTab(tab.id, {
			title: fileNameFromPath(next),
			icon: kind.icon,
			reuseKey: fileReuseKey(next),
			payload: { kind: 'file', path: next } satisfies FilesFilePayload,
		})
	}
}

export function closeOpenFilesUnder(root: string) {
	const store = useExtensionStore.getState()
	for (const tab of [...store.tabs]) {
		const path = fileTabPath(tab)
		if (!path) continue
		if (path !== root && !path.startsWith(`${root}/`)) continue
		store.closeTab(tab.id)
	}
}
