import type { PluginOpenResult } from '../../types'
import { useExtensionStore } from '../../store'

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
	return {
		title: '文件',
		reuseKey: 'explorer',
		payload: { kind: 'explorer' } satisfies FilesExplorerPayload,
	}
}

export function fileNameFromPath(path: string) {
	return path.split('/').filter(Boolean).pop() ?? path
}

export function openFileTab(path: string) {
	useExtensionStore.getState().openTab({
		pluginId: 'files',
		title: fileNameFromPath(path),
		reuseKey: `file:${path}`,
		payload: { kind: 'file', path } satisfies FilesFilePayload,
	})
}
