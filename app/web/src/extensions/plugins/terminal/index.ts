import { TerminalIcon } from '../../../icons'
import { mockPty } from '../../contracts/adapters/mock'
import type { ExtensionPlugin, ExtensionTab } from '../../types'
import { SessionSwitcher } from './SessionSwitcher'
import { TerminalView } from './TerminalView'
import { createTerminalOpen, isTerminalPayload } from './open'

function onTabClosed(tab: ExtensionTab) {
	if (!isTerminalPayload(tab.payload)) return
	void mockPty.dispose(tab.payload.sessionId)
}

export const terminalPlugin: ExtensionPlugin = {
	id: 'terminal',
	title: '终端',
	description: '在工作区打开终端会话',
	icon: TerminalIcon,
	open: createTerminalOpen,
	render: TerminalView,
	renderSide: SessionSwitcher,
	onTabClosed,
}
