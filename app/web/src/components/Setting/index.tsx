import { useState } from 'react'
import classNames from 'classnames'
import { UserBar } from '../UserBar'
import {
	BackArrowIcon,
	AppearanceIcon,
	ModelIcon,
	AgentsIcon,
	SettingsIcon,
} from '../../icons'
import { useCommonStore } from '../../store'
import { SearchInput } from '../../ui/SearchInput'
import { Appearance } from './Appearance'
import { General } from './General'
import { Models } from './Models'
import { Agents } from './Agents'
import { searchSettings, type SettingCategory, type SettingEntryId, type SettingFocus } from './settingSearch'
import '../../styles/scrollbar.css'

const CATEGORIES = [
	{ key: 'general', label: '通用', Icon: SettingsIcon, Panel: General },
	{ key: 'appearance', label: '外观', Icon: AppearanceIcon, Panel: Appearance },
	{ key: 'models', label: '模型', Icon: ModelIcon, Panel: Models },
	{ key: 'agents', label: '代理', Icon: AgentsIcon, Panel: Agents },
] as const

type CategoryKey = (typeof CATEGORIES)[number]['key']

export function Setting() {
	const toggleSetting = useCommonStore((s) => s.toggleSetting)
	const [scrollHover, setScrollHover] = useState(false)
	const [activeKey, setActiveKey] = useState<CategoryKey>('general')
	const [query, setQuery] = useState('')
	const [focus, setFocus] = useState<SettingFocus | null>(null)
	const searching = query.trim().length > 0
	const results = searchSettings(query)

	const activeCategory =
		CATEGORIES.find((c) => c.key === activeKey) ?? CATEGORIES[0]!
	const Panel = activeCategory.Panel

	function openResult(category: SettingCategory, id: SettingEntryId) {
		setActiveKey(category)
		setFocus((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }))
	}

	return (
		<div className="fixed inset-0 z-50 flex bg-app">
			<aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-border bg-sidebar">
				<header className="flex flex-col gap-2 px-1.5 pt-3">
					<button
						type="button"
						onClick={toggleSetting}
						className="flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-md text-fg-2 transition-colors duration-100 hover:bg-surface-hover hover:text-fg-bright"
					>
						<BackArrowIcon />
						<span>返回</span>
					</button>
					<SearchInput value={query} onChange={setQuery} placeholder="搜索设置" />
				</header>

				<div
					className={classNames(
						'flex flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-shallow px-1.5 pb-2 pt-2',
						scrollHover && 'scrollbar-shallow--hover',
					)}
					style={{ scrollbarGutter: 'auto' }}
					onMouseEnter={() => setScrollHover(true)}
					onMouseLeave={() => setScrollHover(false)}
				>
					{searching ? (
						results.length === 0 ? (
							<p className="px-2.5 py-1 text-center text-sm text-fg-3">没有匹配的设置</p>
						) : (
							results.map((entry) => {
								const category = CATEGORIES.find((item) => item.key === entry.category)
								if (!category) return null
								const isActive = focus?.id === entry.id
								return (
									<button
										key={entry.id}
										type="button"
										onClick={() => openResult(entry.category, entry.id)}
										className={classNames(
											'flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-md transition-colors duration-100',
											isActive
												? 'bg-surface-active text-fg-bright'
												: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
										)}
									>
										<category.Icon />
										<span className="shrink-0">{category.label}</span>
										<span className="min-w-0 truncate text-fg-3">{entry.label}</span>
									</button>
								)
							})
						)
					) : (
						CATEGORIES.map(({ key, label, Icon }) => {
							const isActive = key === activeKey
							return (
								<button
									key={key}
									type="button"
									onClick={() => setActiveKey(key)}
									className={classNames(
										'flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-md transition-colors duration-100',
										isActive
											? 'bg-surface-active text-fg-bright'
											: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
									)}
								>
									<Icon />
									<span>{label}</span>
								</button>
							)
						})
					)}
				</div>

				<UserBar />
			</aside>

			<main className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-[700px] px-8 py-10">
					<h1 className="mb-6 text-xl text-fg-bright">{activeCategory.label}</h1>
					<Panel focus={focus} />
				</div>
			</main>
		</div>
	)
}
