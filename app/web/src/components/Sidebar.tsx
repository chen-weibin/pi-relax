import {
	SidebarActions,
	type SidebarActionItem,
} from './SidebarActions'
import {
	SendIcon,
	SearchIcon,
	BlocksIcon,
} from '../icons'
import { UserBar } from './UserBar'

interface Props {
	onOpenSetting: () => void
	collapsed?: boolean
}

export function Sidebar({ onOpenSetting, collapsed = false }: Props) {
	if (collapsed) return null

	const actions: SidebarActionItem[] = [
		{ key: 'newChat', icon: SendIcon, label: '新对话', onClick: () => {} },
		{ key: 'search', icon: SearchIcon, label: '搜索', onClick: () => {} },
		{
			key: 'customize',
			icon: BlocksIcon,
			label: '自定义',
			onClick: () => {},
		},
	]

	return (
		<aside className="flex h-full w-full flex-col border-r border-border bg-sidebar">
			<SidebarActions activeKey={null} items={actions} />
			<UserBar onOpenSetting={onOpenSetting} />
		</aside>
	)
}