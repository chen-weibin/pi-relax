import { useState } from 'react'
import { DisclosureRow } from '../ui/DisclosureRow'
import { Preview } from './frame'

function Row({
	title,
	blinking,
	disabled,
	withContent = true,
}: {
	title: string
	blinking?: boolean
	disabled?: boolean
	withContent?: boolean
}) {
	const [open, setOpen] = useState(false)
	return (
		<DisclosureRow title={title} open={open} onOpenChange={setOpen} blinking={blinking} disabled={disabled}>
			{withContent ? <p className="text-sm text-fg-2">展开后的内容。</p> : null}
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
			<Preview label="disabled（无内容）" bodyClassName="items-stretch">
				<div className="w-full">
					<Row title="没有内容" disabled withContent={false} />
				</div>
			</Preview>
			<Preview label="disabled（有内容也不展开）" bodyClassName="items-stretch">
				<div className="w-full">
					<Row title="不可展开" disabled />
				</div>
			</Preview>
		</div>
	)
}

export const disclosureRowDoc = {
	id: 'disclosure-row',
	heading: 'DisclosureRow',
	description: '标题加箭头的折叠行。右边的标题在扫光。disabled 时不渲染箭头,也展开不了。',
	nav: ['DisclosureRow'],
	Demo: DisclosureRowDemo,
}
