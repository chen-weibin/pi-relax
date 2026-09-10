import {
	SidebarActions,
	type SidebarActionItem,
} from './SidebarActions'
import {
	SendIcon,
	SearchIcon,
	BlocksIcon,
} from '../icons'

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
			<div className="mt-auto px-2 py-3">
				<div
					onClick={onOpenSetting}
					className="cursor-pointer rounded-md px-3 py-1.5 text-fg-2 hover:bg-surface-hover hover:text-fg"
				>
					setting
				</div>
			</div>
		</aside>
	)
}