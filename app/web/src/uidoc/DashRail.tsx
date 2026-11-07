import { useState } from 'react'
import { DashRail, type DashRailItem } from '../ui/DashRail'
import { Preview } from './frame'

const few: DashRailItem[] = [
	{ id: 'a', label: '第一条', preview: <p>短说明，悬停这一条就能看到。</p> },
	{
		id: 'b',
		label: '第二条',
		preview: (
			<div className="flex flex-col gap-2">
				<p>第一段。说明可以是多行，卡片宽度固定，排版由调用方写。</p>
				<p>第二段。这一条没有业务含义，只用来看浮层。</p>
			</div>
		),
	},
	{ id: 'c', label: '第三条', preview: <p>没被点中也会出说明。浮层跟着指针最近的那条，不跟着当前项。</p> },
	{ id: 'd', label: '第四条', preview: <p>点一条才换当前项。指针滑过只把正中那条拉长。</p> },
]

const many: DashRailItem[] = Array.from({ length: 18 }, (_, index) => ({
	id: `m${index}`,
	label: `第 ${index + 1} 条`,
	preview: <p>第 {index + 1} 条。条数多的时候，滑过正中那条仍会拉长。</p>,
}))

function RailPreview({
	title,
	items,
	initial,
	ariaLabel,
}: {
	title: string
	items: DashRailItem[]
	initial: string
	ariaLabel: string
}) {
	const [activeId, setActiveId] = useState(initial)
	const active = items.find((item) => item.id === activeId)
	return (
		<Preview label={`${title} · ${active?.label ?? '未选'}`} bodyClassName="items-start justify-start py-6 pl-8">
			<DashRail items={items} activeId={activeId} onSelect={setActiveId} ariaLabel={ariaLabel} />
		</Preview>
	)
}

function DashRailDemo() {
	return (
		<div className="grid grid-cols-2 gap-4">
			<RailPreview title="4 条" items={few} initial="c" ariaLabel="少量" />
			<RailPreview title="18 条" items={many} initial="m8" ariaLabel="多量" />
		</div>
	)
}

export const dashRailDoc = {
	id: 'dash-rail',
	heading: 'DashRail',
	description: '左边 4 条，右边 18 条。当前项只在点击时更换。指针滑过时，正中那条向右拉长。',
	nav: ['DashRail'],
	Demo: DashRailDemo,
}
