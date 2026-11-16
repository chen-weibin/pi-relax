import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { droppedCachePaths, listedParentsToRefresh, type FsChange } from '../../../api/fs/frames'
import { fsApi } from '../../contracts/adapters/fsHttp'
import type { FsEntry } from '../../contracts/fs'

export type CreateKind = 'file' | 'dir'

export type CreatingState = {
	parentPath: string
	kind: CreateKind
	/** When set, inline input sits above this sibling path; otherwise at the start of parent children. */
	beforePath?: string
}

type FilesTreeState = {
	root: string | null
	rootError: string | null
	navOpen: boolean
	setNavOpen: (open: boolean | ((current: boolean) => boolean)) => void
	selectedDir: string | null
	setSelectedDir: (path: string | null) => void
	creating: CreatingState | null
	beginCreate: (parentPath: string, kind: CreateKind, beforePath?: string) => void
	cancelCreate: () => void
	expanded: Record<string, true>
	childrenByPath: Record<string, FsEntry[]>
	loading: Record<string, true>
	syncRoot: (cwd: string | null) => void
	toggleDir: (path: string) => void
	expandDir: (path: string) => void
	ensureChildren: (path: string) => void
	reloadChildren: (path: string) => Promise<void>
	refreshListed: (changes: readonly FsChange[]) => Promise<void>
}

let loadToken = 0
const tokens = new Map<string, number>()

function load(path: string, set: (fn: (state: FilesTreeState) => void) => void): Promise<void> {
	const mine = ++loadToken
	tokens.set(path, mine)
	set((state) => {
		state.loading[path] = true
		if (path === state.root) state.rootError = null
	})
	return fsApi.list(path).then(
		(listed) => {
			if (tokens.get(path) !== mine) return
			set((state) => {
				state.childrenByPath[path] = listed
				delete state.loading[path]
			})
		},
		(err: unknown) => {
			if (tokens.get(path) !== mine) return
			set((state) => {
				delete state.loading[path]
				if (path === state.root) state.rootError = err instanceof Error ? err.message : '无法读取目录'
			})
		},
	)
}

export function listedFileSize(path: string): number | undefined {
	for (const entries of Object.values(useFilesTreeStore.getState().childrenByPath)) {
		const hit = entries.find((entry) => entry.kind === 'file' && entry.path === path)
		if (hit) return hit.size
	}
	return undefined
}

export async function resolveFileSize(path: string): Promise<number> {
	const listed = listedFileSize(path)
	if (listed !== undefined) return listed
	return (await fsApi.stat(path)).size
}

export function parentDirPath(path: string): string | null {
	const trimmed = path.replace(/\/+$/, '')
	const idx = trimmed.lastIndexOf('/')
	if (idx <= 0) return idx === 0 ? '/' : null
	return trimmed.slice(0, idx)
}

export function joinFsPath(parent: string, name: string): string {
	if (parent === '/') return `/${name}`
	return `${parent}/${name}`
}

export function resolveCreateParent(
	root: string | null,
	selectedDir: string | null,
	selectedFilePath: string | undefined,
): string | null {
	if (selectedDir) return selectedDir
	if (selectedFilePath) {
		const parent = parentDirPath(selectedFilePath)
		if (parent) return parent
	}
	return root
}

export const useFilesTreeStore = create<FilesTreeState>()(
	immer((set, get) => ({
		root: null,
		rootError: null,
		navOpen: true,
		setNavOpen: (open) =>
			set((state) => {
				state.navOpen = typeof open === 'function' ? open(state.navOpen) : open
			}),
		selectedDir: null,
		setSelectedDir: (path) =>
			set((state) => {
				state.selectedDir = path
			}),
		creating: null,
		beginCreate: (parentPath, kind, beforePath) => {
			const { root } = get()
			if (!root) return
			if (parentPath !== root) {
				set((state) => {
					state.expanded[parentPath] = true
				})
			}
			get().ensureChildren(parentPath)
			set((state) => {
				state.creating = beforePath ? { parentPath, kind, beforePath } : { parentPath, kind }
			})
		},
		cancelCreate: () =>
			set((state) => {
				state.creating = null
			}),
		expanded: {},
		childrenByPath: {},
		loading: {},
		syncRoot: (cwd) => {
			if (get().root === cwd) {
				if (cwd) get().ensureChildren(cwd)
				return
			}
			set((state) => {
				state.root = cwd
				state.rootError = null
				state.expanded = {}
				state.childrenByPath = {}
				state.loading = {}
				state.selectedDir = null
				state.creating = null
			})
			if (cwd) get().ensureChildren(cwd)
		},
		toggleDir: (path) => {
			const wasOpen = Boolean(get().expanded[path])
			set((state) => {
				if (wasOpen) delete state.expanded[path]
				else state.expanded[path] = true
			})
			if (!wasOpen) get().ensureChildren(path)
		},
		expandDir: (path) => {
			if (get().expanded[path]) {
				get().ensureChildren(path)
				return
			}
			set((state) => {
				state.expanded[path] = true
			})
			get().ensureChildren(path)
		},
		ensureChildren: (path) => {
			const { childrenByPath, loading } = get()
			if (childrenByPath[path] || loading[path]) return
			load(path, set)
		},
		reloadChildren: (path) => load(path, set),
		refreshListed: (changes) => {
			const dead = new Set(droppedCachePaths(Object.keys(get().childrenByPath), changes))
			if (dead.size > 0) {
				set((state) => {
					for (const key of dead) {
						delete state.childrenByPath[key]
						delete state.expanded[key]
					}
					if (state.selectedDir && dead.has(state.selectedDir)) state.selectedDir = null
				})
			}
			const listed = new Set(Object.keys(get().childrenByPath))
			const parents = listedParentsToRefresh(changes, listed)
			return Promise.all(parents.map((parent) => load(parent, set))).then(() => {})
		},
	})),
)
