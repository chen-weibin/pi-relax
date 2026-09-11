import { useCallback, useMemo } from 'react'
import {
	useDefaultLayout,
	type Layout,
	type LayoutChangedMeta,
} from 'react-resizable-panels'

export type PersistedLayoutState = {
	defaultLayout: Layout | undefined
	onLayoutChanged: (layout: Layout, meta: LayoutChangedMeta) => void
}

const STORAGE_KEY_PREFIX = 'app-shell:layout'

function readStored(key: string): Layout | undefined {
	try {
		const raw = localStorage.getItem(key)
		if (!raw) return undefined
		const parsed = JSON.parse(raw) as Layout
		if (!parsed || typeof parsed !== 'object') return undefined
		return parsed
	} catch {
		return undefined
	}
}

function writeStored(key: string, raw: string) {
	try {
		localStorage.setItem(key, raw)
	} catch {
		// ponytail: ignore quota / private mode failures, layout will reset on next load
	}
}

export function usePersistedPanelLayout({
	groupId,
	panelIds,
}: {
	groupId: string
	panelIds: string[]
}): PersistedLayoutState {
	const storageKey = `${STORAGE_KEY_PREFIX}:${groupId}`

	const storage = useMemo(
		() => ({
			getItem: (): string | null => {
				try {
					return localStorage.getItem(storageKey)
				} catch {
					return null
				}
			},
			setItem: (_name: string, value: string) => writeStored(storageKey, value),
		}),
		[storageKey],
	)

	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: groupId,
		panelIds,
		storage,
	})

	const handleLayoutChanged = useCallback(
		(layout: Layout, meta: LayoutChangedMeta) => {
			onLayoutChanged(layout, meta)
		},
		[onLayoutChanged],
	)

	return {
		defaultLayout,
		onLayoutChanged: handleLayoutChanged,
	}
}
