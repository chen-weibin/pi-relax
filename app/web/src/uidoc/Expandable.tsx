import { useState } from 'react'
import { Expandable } from '../ui/Expandable'
import { DemoButton, Preview } from './frame'

function ExpandableDemo() {
	const [open, setOpen] = useState(false)
	return (
		<Preview label="高度过渡" bodyClassName="flex-col gap-3">
			<DemoButton onClick={() => setOpen((value) => !value)}>{open ? '收起' : '展开'}</DemoButton>
			<Expandable open={open} className="w-full">
				<p className="pt-2 text-sm text-fg-2">折叠区域内的文字。</p>
			</Expandable>
		</Preview>
	)
}

export const expandableDoc = {
	id: 'expandable',
	heading: 'Expandable',
	description: '只有高度过渡，没有标题。按钮控制展开和收起。',
	nav: ['Expandable'],
	Demo: ExpandableDemo,
}
