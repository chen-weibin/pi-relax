import { Conversation } from './Conversation'
import { CustomizeView } from './CustomizeView'
import { useCommonStore } from '../store'

export function MainContainer() {
	const view = useCommonStore((s) => s.mainView)

	if (view === 'customize') {
		return <CustomizeView />
	}

	return <Conversation />
}
