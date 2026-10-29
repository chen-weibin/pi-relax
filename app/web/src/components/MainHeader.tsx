import { useSyncExternalStore } from 'react'
import { DRAFT_TITLE } from '../session/draft'
import { sessionTitle } from '../session/groupCatalog'
import { getTransportSnapshot, subscribeTransport } from '../session'
import { useCatalogStore, useCommonStore } from '../store'
import { ShellPanelToggles } from './ShellPanelToggles'

function useHeaderTitle(): string {
	const mainView = useCommonStore((state) => state.mainView)
	const openSessionId = useSyncExternalStore(subscribeTransport, () => getTransportSnapshot().openSessionId)
	const activeDraftCwd = useCatalogStore((state) => state.activeDraftCwd)
	const sessionLabel = useCatalogStore((state) => {
		if (!openSessionId) return ''
		for (const page of Object.values(state.sessionPages)) {
			const hit = page.sessions.find((session) => session.id === openSessionId)
			if (hit) return sessionTitle(hit)
		}
		return ''
	})
	if (mainView !== 'conversation') return ''
	if (activeDraftCwd) return DRAFT_TITLE
	return sessionLabel
}

export function MainHeader() {
	const extensionOpen = useCommonStore((state) => state.extensionOpen)
	const title = useHeaderTitle()

	return (
		<div className="flex h-9 shrink-0 items-center gap-2 px-3">
			<div className="min-w-0 flex-1">
				{title ? (
					<span className="block w-fit max-w-[min(20rem,100%)] truncate text-md text-fg" title={title}>
						{title}
					</span>
				) : null}
			</div>
			{!extensionOpen && (
				<div className="shrink-0">
					<ShellPanelToggles />
				</div>
			)}
		</div>
	)
}
