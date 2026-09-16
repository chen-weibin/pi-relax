import { useState } from 'react'
import classNames from 'classnames'
import { UserBar } from './UserBar'
import {
	BackArrowIcon,
	AppearanceIcon,
	ModelIcon,
	AgentsIcon,
	SettingsIcon,
} from '../icons'
import { SearchInput } from '../ui/SearchInput'
import { useCommonStore } from '../store'
import '../styles/scrollbar.css'

const GROUPS = [
	[
		{ key: 'general', label: '通用', Icon: SettingsIcon },
		{ key: 'appearance', label: '外观', Icon: AppearanceIcon },
	],
	[
		{ key: 'models', label: '模型', Icon: ModelIcon },
		{ key: 'agents', label: '代理', Icon: AgentsIcon },
	],
] as const

export function Setting() {
	const toggleSetting = useCommonStore((s) => s.toggleSetting)
	const [scrollHover, setScrollHover] = useState(false)

	return (
		<div className="fixed inset-0 z-50 flex bg-app">
			<aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-border bg-sidebar">
				<header className="px-1.5 pt-3">
					<button
						type="button"
						onClick={toggleSetting}
						className="flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-md text-fg-2 transition-colors duration-100 hover:bg-surface-hover hover:text-fg-bright"
					>
						<BackArrowIcon />
						<span>返回</span>
					</button>
				</header>

				<div className="px-1.5 pb-3 pt-3">
					<SearchInput placeholder="搜索设置" />
				</div>

				<div
					className={classNames(
						'flex flex-1 flex-col gap-3 overflow-y-auto scrollbar-shallow px-1.5 pb-2',
						scrollHover && 'scrollbar-shallow--hover',
					)}
					style={{ scrollbarGutter: 'auto' }}
					onMouseEnter={() => setScrollHover(true)}
					onMouseLeave={() => setScrollHover(false)}
				>
					{GROUPS.map((group, gi) => (
						<div key={gi} className="flex flex-col">
							{group.map(({ key, label, Icon }) => (
								<button
									key={key}
									type="button"
									className="flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-md text-fg-2 transition-colors duration-100 hover:bg-surface-hover hover:text-fg-bright"
								>
									<Icon />
									<span>{label}</span>
								</button>
							))}
						</div>
					))}
				</div>

				<UserBar />
			</aside>

			<main className="flex-1" />
		</div>
	)
}
