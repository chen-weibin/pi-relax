import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const LOCAL_STORAGE_KEY = 'relax'
const LOCAL_STORAGE_VERSION = 1

export type LocalDocument = {
	version: 1
	layout: Record<string, unknown>
	projectsCollapsed: string[]
}

interface LocalState {
	layout: Record<string, unknown>
	projectsCollapsed: string[]
	setLayout: (groupId: string, value: unknown) => void
	setProjectCollapsed: (id: string, collapsed: boolean) => void
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
	const empty: LocalDocument = { version: 1, layout: {}, projectsCollapsed: [] }
	if (!raw) return empty
	try {
		const parsed: unknown = JSON.parse(raw)
		if (!isRecord(parsed) || parsed.version !== LOCAL_STORAGE_VERSION) return empty
		return {
			version: 1,
			layout: readLayout(parsed.layout),
			projectsCollapsed: readCollapsed(parsed.projectsCollapsed),
		}
	} catch {
		return empty
	}
}

function loadLocalState(): Pick<LocalState, 'layout' | 'projectsCollapsed'> {
	const empty = { layout: {}, projectsCollapsed: [] as string[] }
	try {
		if (typeof localStorage === 'undefined') return empty
		const doc = parseLocalDocument(localStorage.getItem(LOCAL_STORAGE_KEY))
		return { layout: doc.layout, projectsCollapsed: doc.projectsCollapsed }
	} catch {
		return empty
	}
}

function writeLocal(state: Pick<LocalState, 'layout' | 'projectsCollapsed'>) {
	const doc: LocalDocument = {
		version: 1,
		layout: state.layout,
		projectsCollapsed: state.projectsCollapsed,
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
	})),
)
