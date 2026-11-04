import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
	moveExtensionKey,
	readExtensionBook,
	type ExtensionSnapshot,
} from '../extensions/snapshot.ts'

export const LOCAL_STORAGE_KEY = 'relax'
const LOCAL_STORAGE_VERSION = 1

export type LocalDocument = {
	version: 1
	layout: Record<string, unknown>
	projectsCollapsed: string[]
	extensions: Record<string, ExtensionSnapshot>
}

interface LocalState {
	layout: Record<string, unknown>
	projectsCollapsed: string[]
	extensions: Record<string, ExtensionSnapshot>
	setLayout: (groupId: string, value: unknown) => void
	setProjectCollapsed: (id: string, collapsed: boolean) => void
	setExtension: (key: string, snapshot: ExtensionSnapshot) => void
	moveExtension: (from: string, to: string) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readLayout(value: unknown): Record<string, unknown> {
	if (!isRecord(value)) return {}
	const layout: Record<string, unknown> = {}
	for (const [key, entry] of Object.entries(value)) {
		if (isRecord(entry)) layout[key] = entry
	}
	return layout
}

function readCollapsed(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	const seen = new Set<string>()
	const ids: string[] = []
	for (const item of value) {
		if (typeof item !== 'string' || item.length === 0 || seen.has(item)) continue
		seen.add(item)
		ids.push(item)
	}
	return ids
}

export function parseLocalDocument(raw: string | null): LocalDocument {
	const empty: LocalDocument = { version: 1, layout: {}, projectsCollapsed: [], extensions: {} }
	if (!raw) return empty
	try {
		const parsed: unknown = JSON.parse(raw)
		if (!isRecord(parsed) || parsed.version !== LOCAL_STORAGE_VERSION) return empty
		return {
			version: 1,
			layout: readLayout(parsed.layout),
			projectsCollapsed: readCollapsed(parsed.projectsCollapsed),
			extensions: readExtensionBook(parsed.extensions),
		}
	} catch {
		return empty
	}
}

function loadLocalState(): Pick<LocalState, 'layout' | 'projectsCollapsed' | 'extensions'> {
	const empty = { layout: {}, projectsCollapsed: [] as string[], extensions: {} }
	try {
		if (typeof localStorage === 'undefined') return empty
		const doc = parseLocalDocument(localStorage.getItem(LOCAL_STORAGE_KEY))
		return { layout: doc.layout, projectsCollapsed: doc.projectsCollapsed, extensions: doc.extensions }
	} catch {
		return empty
	}
}

function writeLocal(state: Pick<LocalState, 'layout' | 'projectsCollapsed' | 'extensions'>) {
	const doc: LocalDocument = {
		version: 1,
		layout: state.layout,
		projectsCollapsed: state.projectsCollapsed,
		extensions: state.extensions,
	}
	try {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(doc))
	} catch {
		// ponytail: quota / private mode; the in-memory store still updates
	}
}

export const useLocalStore = create<LocalState>()(
	immer((set, get) => ({
		...loadLocalState(),
		setLayout: (groupId, value) => {
			if (!groupId || !isRecord(value)) return
			set((state) => {
				state.layout[groupId] = value
			})
			writeLocal(get())
		},
		setProjectCollapsed: (id, collapsed) => {
			if (!id) return
			const current = get().projectsCollapsed
			const has = current.includes(id)
			if (collapsed === has) return
			set((state) => {
				if (collapsed) state.projectsCollapsed.push(id)
				else state.projectsCollapsed = state.projectsCollapsed.filter((item) => item !== id)
			})
			writeLocal(get())
		},
		setExtension: (key, snapshot) => {
			if (!key) return
			set((state) => {
				state.extensions[key] = snapshot
			})
			writeLocal(get())
		},
		moveExtension: (from, to) => {
			if (!from || !to || from === to) return
			const next = moveExtensionKey(get().extensions, from, to)
			if (next === get().extensions) return
			set((state) => {
				state.extensions = next
			})
			writeLocal(get())
		},
	})),
)
