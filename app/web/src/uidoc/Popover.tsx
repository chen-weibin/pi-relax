import { Popover } from '../ui/Popover'
import { DemoButton, Preview } from './frame'

function PopoverDemo() {
	return (
		<div className="grid grid-cols-2 gap-4">
			<Preview label="click">
				<Popover content={<div className="px-3 py-2">点击打开的内容</div>}>
					<DemoButton>打开</DemoButton>
				</Popover>
			</Preview>
			<Preview label="hover">
				<Popover trigger={['hover']} content={<div className="px-3 py-2">悬停打开的内容</div>}>
					<DemoButton>悬停</DemoButton>
				</Popover>
			</Preview>
		</div>
	)
}

export const popoverDoc = {
	id: 'popover',
	heading: 'Popover',
	description: '浮层。一块点击打开，一块悬停打开。',
	nav: ['Popover'],
	Demo: PopoverDemo,
}
