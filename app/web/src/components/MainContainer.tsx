import { Conversation } from './Conversation'
import { CustomizeView } from './CustomizeView'
import type { MainView } from '../App'

interface Props {
	view: MainView
	onToggleSidebar: () => void
	onToggleExtension: () => void
	sidebarOpen: boolean
	extensionOpen: boolean
}

export function MainContainer({
	view,
	onToggleSidebar,
	onToggleExtension,
	sidebarOpen,
	extensionOpen,
}: Props) {
	if (view === 'customize') {
		return <CustomizeView />
	}

	return (
		<Conversation
			onToggleSidebar={onToggleSidebar}
			onToggleExtension={onToggleExtension}
			sidebarOpen={sidebarOpen}
			extensionOpen={extensionOpen}
		/>
	)
}
