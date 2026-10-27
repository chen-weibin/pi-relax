import { useState } from 'react'
import { DisclosureRow } from '../ui/DisclosureRow'
import { Preview } from './frame'

function Row({ title, blinking }: { title: string; blinking?: boolean }) {
	const [open, setOpen] = useState(false)
	return (
		<DisclosureRow title={title} open={open} onOpenChange={setOpen} blinking={blinking}>
			<p className="text-sm text-fg-2">展开后的内容。</p>
		</DisclosureRow>
	)
}

function DisclosureRowDemo() {
	return (
		<div className="grid grid-cols-2 gap-4">
			<Preview label="普通" bodyClassName="items-stretch">
				<div className="w-full">
					<Row title="详情" />
				</div>
			</Preview>
			<Preview label="blinking" bodyClassName="items-stretch">
				<div className="w-full">
					<Row title="生成中" blinking />
				</div>
			</Preview>
		</div>
	)
}

export const disclosureRowDoc = {
	id: 'disclosure-row',
	heading: 'DisclosureRow',
	description: '标题加箭头的折叠行。右边的标题在扫光。',
	nav: ['DisclosureRow'],
	Demo: DisclosureRowDemo,
}
