import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { FS_ROOT, mockFs } from '../../contracts/adapters/mock'
import type { FsEntry } from '../../contracts/fs'

type FilesTreeState = {
	navOpen: boolean
	setNavOpen: (open: boolean | ((current: boolean) => boolean)) => void
	expanded: Record<string, true>
	childrenByPath: Record<string, FsEntry[]>
	loading: Record<string, true>
	toggleDir: (path: string) => void
	ensureChildren: (path: string) => void
}

export const useFilesTreeStore = create<FilesTreeState>()(
	immer((set, get) => ({
		navOpen: true,
		setNavOpen: (open) =>
			set((s) => {
				s.navOpen = typeof open === 'function' ? open(s.navOpen) : open
			}),
		expanded: { [FS_ROOT]: true },
		childrenByPath: {},
		loading: {},
		toggleDir: (path) => {
			const wasOpen = Boolean(get().expanded[path])
			set((s) => {
				if (wasOpen) delete s.expanded[path]
				else s.expanded[path] = true
			})
			if (!wasOpen) get().ensureChildren(path)
		},
		ensureChildren: (path) => {
			const { childrenByPath, loading } = get()
			if (childrenByPath[path] || loading[path]) return
			set((s) => {
				s.loading[path] = true
			})
			void mockFs.list(path).then(
				(listed) => {
					set((s) => {
						s.childrenByPath[path] = listed
						delete s.loading[path]
					})
				},
				() => {
					set((s) => {
						s.childrenByPath[path] = []
						delete s.loading[path]
					})
				},
			)
		},
	})),
)
