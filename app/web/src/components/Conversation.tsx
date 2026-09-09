import classNames from 'classnames'
import { PanelLeftIcon, PanelRightIcon } from '../icons'
import { IconButton } from '../ui/IconButton'

interface Props {
	className?: string
	onToggleSidebar: () => void
	onToggleExtension: () => void
	sidebarOpen: boolean
	extensionOpen: boolean
}

export function Conversation({
	className,
	onToggleSidebar,
	onToggleExtension,
	sidebarOpen,
	extensionOpen,
}: Props) {
	return (
		<div className={classNames('flex h-full w-full flex-col bg-app text-fg-3 text-sm', className)}>
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<div className="text-fg-2 text-sm">conversation</div>
				<div className="flex gap-1">
					<IconButton
						onClick={onToggleSidebar}
						title={sidebarOpen ? '收起左侧栏' : '展开左侧栏'}
					>
						<PanelLeftIcon />
					</IconButton>
					<IconButton
						onClick={onToggleExtension}
						title={extensionOpen ? '收起右侧栏' : '展开右侧栏'}
					>
						<PanelRightIcon />
					</IconButton>
				</div>
			</div>
			<div className="flex flex-1 items-center justify-center">conversation</div>
		</div>
	)
}
