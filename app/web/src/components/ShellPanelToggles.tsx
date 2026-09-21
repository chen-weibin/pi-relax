import { useShallow } from 'zustand/react/shallow'
import { useCommonStore } from '../store'
import { IconButton } from '../ui/IconButton'
import { PanelLeftIcon, PanelRightIcon } from '../icons'

export function ShellPanelToggles() {
	const { sidebarOpen, extensionOpen, toggleSidebar, toggleExtension } = useCommonStore(
		useShallow((s) => ({
			sidebarOpen: s.sidebarOpen,
			extensionOpen: s.extensionOpen,
			toggleSidebar: s.toggleSidebar,
			toggleExtension: s.toggleExtension,
		})),
	)

	return (
		<div className="flex items-center gap-1">
			<IconButton
				onClick={toggleSidebar}
				title={sidebarOpen ? '收起左侧栏' : '展开左侧栏'}
			>
				<PanelLeftIcon />
			</IconButton>
			<IconButton
				onClick={toggleExtension}
				title={extensionOpen ? '收起右侧栏' : '展开右侧栏'}
			>
				<PanelRightIcon />
			</IconButton>
		</div>
	)
}
