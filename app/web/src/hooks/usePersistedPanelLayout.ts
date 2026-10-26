import { useMemo } from 'react'
import {
	useDefaultLayout,
	type Layout,
	type LayoutChangedMeta,
} from 'react-resizable-panels'
import { useLocalStore } from '../store'

export type PersistedLayoutState = {
	defaultLayout: Layout | undefined
	onLayoutChanged: (layout: Layout, meta: LayoutChangedMeta) => void
}

export function usePersistedPanelLayout({
	groupId,
	panelIds,
}: {
	groupId: string
	panelIds: string[]
}): PersistedLayoutState {
	const storage = useMemo(
		() => ({
			getItem: (): string | null => {
				const value = useLocalStore.getState().layout[groupId]
				if (!value || typeof value !== 'object') return null
				return JSON.stringify(value)
			},
			setItem: (_name: string, raw: string) => {
				try {
					useLocalStore.getState().setLayout(groupId, JSON.parse(raw) as unknown)
				} catch {
					// library wrote a value this store cannot keep; previous layout stays
				}
			},
		}),
		[groupId],
	)

	return useDefaultLayout({
		id: groupId,
		panelIds,
		storage,
	})
}
