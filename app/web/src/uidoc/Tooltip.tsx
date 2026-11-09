import type { Placement } from '@floating-ui/react'
import { useState } from 'react'
import { Tooltip } from '../ui/Tooltip'
import { Segmented } from '../ui/Segmented'
import { DemoButton } from './frame'

const placements = ['top', 'bottom', 'left', 'right'] as const

function TooltipDemo() {
	const [placement, setPlacement] = useState<Placement>('top')
	return (
		<div className="flex flex-col items-center gap-4">
			<Segmented size="sm" value={placement} options={placements} onChange={setPlacement} />
			<Tooltip title="提示" placement={placement} delay={200}>
				<DemoButton>悬停</DemoButton>
			</Tooltip>
		</div>
	)
}

export const tooltipDoc = {
	id: 'tooltip',
	heading: 'Tooltip',
	description: '短提示。切换方向后悬停按钮查看。',
	nav: ['Tooltip'],
	Demo: TooltipDemo,
}
