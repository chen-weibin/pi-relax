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
import type { MainView } from '../App'
import '../styles/scrollbar.css'

interface Props {
	view: MainView
	onSelectView: (view: MainView) => void
	onOpenSetting: () => void
	collapsed?: boolean
}

function viewFromActionKey(key: string): MainView | null {
	if (key === 'newChat') return 'conversation'
	if (key === 'customize') return 'customize'
	return null
}

function actionKeyFromView(view: MainView): string | null {
	if (view === 'conversation') return 'newChat'
	if (view === 'customize') return 'customize'
	return null
}

export function Sidebar({
	view,
	onSelectView,
	onOpenSetting,
	collapsed = false,
}: Props) {
	const [scrollHover, setScrollHover] = useState(false)

	if (collapsed) return null

	const actions: SidebarActionItem[] = [
		{
			key: 'newChat',
			icon: SendIcon,
			label: '新对话',
			onClick: () => {
				const next = viewFromActionKey('newChat')
				if (next) onSelectView(next)
			},
		},
		{
			key: 'search',
			icon: SearchIcon,
			label: '搜索',
			onClick: () => {},
		},
		{
			key: 'customize',
			icon: BlocksIcon,
			label: '自定义',
			onClick: () => {
				const next = viewFromActionKey('customize')
				if (next) onSelectView(next)
			},
		},
	]

	return (
		<aside className="flex h-full w-full flex-col border-r border-border bg-sidebar">
			<SidebarActions activeKey={actionKeyFromView(view)} items={actions} />
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