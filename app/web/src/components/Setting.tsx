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
import { SettingGroup } from '../ui/SettingGroup'
import { SettingRow } from '../ui/SettingRow'
import { Switch } from '../ui/Switch'
import { Select, type SelectOption } from '../ui/Select'
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

type Category = (typeof GROUPS)[number][number]

const ALL_CATEGORIES: readonly Category[] = GROUPS.flat()

const PLACEHOLDER_OPTIONS = [
	'设置项 1',
	'设置项 2',
	'设置项 3',
	'设置项 4',
	'设置项 5',
	'设置项 6',
	'设置项 7',
	'设置项 8',
]
const SINGLE_PLACEHOLDER = ['设置项']

const STATIC_OPTIONS: SelectOption<string>[] = [
	{ value: 'compact', label: '紧凑' },
	{ value: 'cozy', label: '舒适' },
	{ value: 'spacious', label: '宽松' },
]

const FAKE_REMOTE_ITEMS = Array.from({ length: 47 }, (_, i) => ({
	value: `opt-${i + 1}`,
	label: `远程选项 ${String(i + 1).padStart(2, '0')}`,
	disabled: i === 13,
}))

async function fakeRemoteFetch({
	query,
	offset,
	limit,
}: {
	query: string
	offset: number
	limit: number
}) {
	await new Promise((r) => setTimeout(r, 300))
	const filtered = query
		? FAKE_REMOTE_ITEMS.filter((it) => it.label.includes(query))
		: FAKE_REMOTE_ITEMS
	const items = filtered.slice(offset, offset + limit)
	return { items, hasMore: offset + limit < filtered.length }
}

export function Setting() {
	const toggleSetting = useCommonStore((s) => s.toggleSetting)
	const [scrollHover, setScrollHover] = useState(false)
	const [activeKey, setActiveKey] = useState<Category['key']>('general')
	const [switchOn, setSwitchOn] = useState(false)
	const [staticPick, setStaticPick] = useState<string | undefined>()
	const [remotePick, setRemotePick] = useState<string | undefined>()

	const activeCategory =
		ALL_CATEGORIES.find((c) => c.key === activeKey) ?? ALL_CATEGORIES[0]!

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
							{group.map(({ key, label, Icon }) => {
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
							})}
						</div>
					))}
				</div>

				<UserBar />
			</aside>

			<main className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-[700px] px-8 py-10">
					<h1 className="mb-6 text-xl text-fg-bright">{activeCategory.label}</h1>

					<div className="flex flex-col gap-6">
						<SettingGroup>
							{SINGLE_PLACEHOLDER.map((label) => (
								<SettingRow
									key={label}
									label={label}
									description="待实现"
								>
									<div className="h-7 min-w-[80px] rounded-md border border-border-hover bg-surface" />
								</SettingRow>
							))}
						</SettingGroup>

						<SettingGroup title="子分组">
							{PLACEHOLDER_OPTIONS.map((label, i) => (
								<SettingRow
									key={label}
									label={label}
									description="待实现"
								>
									{i === 0 ? (
										<Switch
											checked={switchOn}
											onChange={setSwitchOn}
											ariaLabel={label}
										/>
									) : i === 1 ? (
										<Select
											className=""
											placeholder="选一个"
											value={staticPick}
											onChange={setStaticPick}
											options={STATIC_OPTIONS}
											dropdownWidth={200}
											placement="bottom-end"
										/>
									) : i === 2 ? (
										<Select
											className=""
											placeholder="搜索远程选项"
											value={remotePick}
											onChange={setRemotePick}
											loadOptions={fakeRemoteFetch}
											searchable
											pageSize={10}
											dropdownWidth={200}
											placement="bottom-end"
										/>
									) : (
										<div className="h-7 min-w-[80px] rounded-md border border-border-hover bg-surface" />
									)}
								</SettingRow>
							))}
						</SettingGroup>
					</div>
				</div>
			</main>
		</div>
	)
}