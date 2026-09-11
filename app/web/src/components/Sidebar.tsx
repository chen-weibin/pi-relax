import { useState } from 'react'
import classNames from 'classnames'
import {
	SidebarActions,
	type SidebarActionItem,
} from './SidebarActions'
import {
	SendIcon,
	SearchIcon,
	BlocksIcon,
} from '../icons'
import { ProjectSection } from './ProjectSection'
import { UserBar } from './UserBar'
import '../styles/scrollbar.css'

interface Props {
	onOpenSetting: () => void
	collapsed?: boolean
}

export function Sidebar({ onOpenSetting, collapsed = false }: Props) {
	const [scrollHover, setScrollHover] = useState(false)

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
			<div
				className={classNames(
					'mt-1 flex-1 overflow-y-auto scrollbar-shallow',
					scrollHover && 'scrollbar-shallow--hover',
				)}
				onMouseEnter={() => setScrollHover(true)}
				onMouseLeave={() => setScrollHover(false)}
			>
				<ProjectSection />
			</div>
			<UserBar onOpenSetting={onOpenSetting} />
		</aside>
	)
}