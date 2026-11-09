import { useState } from 'react'
import { AgentsIcon, BlocksIcon, FileIcon, ModelIcon, SettingsIcon, TerminalIcon } from '../icons'
import {
	GlassIcons,
	type GlassIconsHover,
	type GlassIconsLabels,
	type GlassIconsPlate,
	type GlassIconsSize,
} from '../ui/GlassIcons'
import { Segmented } from '../ui/Segmented'
import { Preview } from './frame'

const sizes = ['sm', 'md', 'lg'] as const
const plates = ['tilt', 'offset', 'none'] as const
const hovers = ['lift', 'float', 'press', 'none'] as const
const labels = ['hover', 'always', 'none'] as const

const BACKDROP =
	'radial-gradient(90% 120% at 15% 0%, hsl(214 95% 66% / 0.55) 0%, transparent 55%),' +
	'radial-gradient(80% 100% at 90% 15%, hsl(276 84% 70% / 0.5) 0%, transparent 55%),' +
	'radial-gradient(90% 110% at 55% 100%, hsl(326 92% 74% / 0.45) 0%, transparent 60%),' +
	'#0d1117'

const items = [
	{ icon: <BlocksIcon />, label: '模块', color: 'blue' },
	{ icon: <TerminalIcon />, label: '终端', color: 'green' },
	{ icon: <FileIcon />, label: '文件', color: 'orange' },
	{ icon: <ModelIcon />, label: '模型', color: 'purple' },
	{ icon: <AgentsIcon />, label: '智能体', color: 'pink' },
	{ icon: <SettingsIcon />, label: '设置', color: 'teal' },
]

function GlassIconsDemo() {
	const [size, setSize] = useState<GlassIconsSize>('md')
	const [plate, setPlate] = useState<GlassIconsPlate>('tilt')
	const [hover, setHover] = useState<GlassIconsHover>('press')
	const [labelMode, setLabelMode] = useState<GlassIconsLabels>('hover')

	return (
		<div className="flex flex-col items-center gap-4">
			<div className="flex flex-wrap justify-center gap-2">
				<Segmented size="sm" value={size} options={sizes} onChange={setSize} />
				<Segmented size="sm" value={plate} options={plates} onChange={setPlate} />
				<Segmented size="sm" value={hover} options={hovers} onChange={setHover} />
				<Segmented size="sm" value={labelMode} options={labels} onChange={setLabelMode} />
			</div>
			<Preview label={`${size} / ${plate} / ${hover} / ${labelMode}`} className="w-full">
				<div
					className="relative w-full overflow-hidden rounded-xl px-8 py-16"
					style={{ background: BACKDROP }}
				>
					<GlassIcons
						items={items}
						size={size}
						plate={plate}
						hover={hover}
						labels={labelMode}
					/>
				</div>
			</Preview>
		</div>
	)
}

export const glassIconsDoc = {
	id: 'glass-icons',
	heading: 'GlassIcons',
	description:
		'液态玻璃图标组。玻璃会折射背后的颜色，鼠标移上去有视差和高光。尺寸、底板形状、悬停动作、标签显示各用一组按钮切换。',
	nav: ['GlassIcons'],
	Demo: GlassIconsDemo,
}
