import { Conversation } from './conversation'
import { CustomizeView } from './CustomizeView'
import { MainHeader } from './MainHeader'
import { useCommonStore } from '../store'

export function MainContainer() {
	const view = useCommonStore((s) => s.mainView)

	return (
		<div className="flex h-full w-full flex-col bg-app text-fg-3 text-sm">
			<MainHeader />
			{view === 'customize' ? <CustomizeView /> : <Conversation />}
		</div>
	)
}
