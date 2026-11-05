import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { droppedCachePaths, listedParentsToRefresh, type FsChange } from '../../../api/fs/frames'
import { fsApi } from '../../contracts/adapters/fsHttp'
import type { FsEntry } from '../../contracts/fs'

type FilesTreeState = {
	root: string | null
	rootError: string | null
	navOpen: boolean
	setNavOpen: (open: boolean | ((current: boolean) => boolean)) => void
	expanded: Record<string, true>
	childrenByPath: Record<string, FsEntry[]>
	loading: Record<string, true>
	syncRoot: (cwd: string | null) => void
	toggleDir: (path: string) => void
	ensureChildren: (path: string) => void
	refreshListed: (changes: readonly FsChange[]) => void
}

let loadToken = 0
const tokens = new Map<string, number>()

function load(path: string, set: (fn: (state: FilesTreeState) => void) => void) {
	const mine = ++loadToken
	tokens.set(path, mine)
	set((state) => {
		state.loading[path] = true
		if (path === state.root) state.rootError = null
	})
	void fsApi.list(path).then(
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

export const useFilesTreeStore = create<FilesTreeState>()(
	immer((set, get) => ({
		root: null,
		rootError: null,
		navOpen: true,
		setNavOpen: (open) =>
			set((state) => {
				state.navOpen = typeof open === 'function' ? open(state.navOpen) : open
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
		ensureChildren: (path) => {
			const { childrenByPath, loading } = get()
			if (childrenByPath[path] || loading[path]) return
			load(path, set)
		},
		refreshListed: (changes) => {
			const dead = new Set(droppedCachePaths(Object.keys(get().childrenByPath), changes))
			if (dead.size > 0) {
				set((state) => {
					for (const key of dead) {
						delete state.childrenByPath[key]
						delete state.expanded[key]
					}
				})
			}
			const listed = new Set(Object.keys(get().childrenByPath))
			for (const parent of listedParentsToRefresh(changes, listed)) {
				load(parent, set)
			}
		},
	})),
)
