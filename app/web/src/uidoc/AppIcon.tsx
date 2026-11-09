import { useState } from 'react'
import { CheckIcon, FileIcon, SettingsIcon, TerminalIcon } from '../icons'
import { AppIcon, appIconSizes, type AppIconSize } from '../ui/AppIcon'
import { Preview, Segmented } from './frame'

const sizes = ['sm', 'md', 'lg'] as const
const glyphs = ['check', 'file', 'terminal', 'settings'] as const

const colors = [
	{ name: '绿', value: '#34C759' },
	{ name: '蓝', value: '#007AFF' },
	{ name: '紫', value: '#AF52DE' },
	{ name: '橙', value: '#FF9500' },
	{ name: '粉', value: '#FF2D55' },
	{ name: '黑', value: '#1C1C1E' },
]

const iconMap = {
	check: <CheckIcon />,
	file: <FileIcon />,
	terminal: <TerminalIcon />,
	settings: <SettingsIcon />,
}

function AppIconDemo() {
	const [size, setSize] = useState<AppIconSize>('md')
	const [glyph, setGlyph] = useState<(typeof glyphs)[number]>('check')
	const [color, setColor] = useState<(typeof colors)[number]>(colors[0]!)

	return (
		<div className="flex flex-col items-center gap-6">
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Segmented value={size} options={sizes} onChange={setSize} />
				<Segmented value={glyph} options={glyphs} onChange={setGlyph} />
			</div>
			<div className="flex flex-wrap items-center justify-center gap-2">
				{colors.map((item) => (
					<button
						key={item.value}
						type="button"
						title={item.name}
						aria-label={item.name}
						aria-pressed={color.value === item.value}
						onClick={() => setColor(item)}
						className="h-6 w-6 rounded-full"
						style={{
							background: item.value,
							boxShadow: color.value === item.value ? '0 0 0 2px var(--fg)' : undefined,
						}}
					/>
				))}
			</div>
			<div className="flex items-end justify-center gap-10">
				<Preview label={`squircle · ${size} · ${appIconSizes[size]}px · ${color.name} · ${glyph}`}>
					<AppIcon size={size} color={color.value} icon={iconMap[glyph]} label="squircle 示例" />
				</Preview>
				<Preview label="border-radius">
					<span
						aria-hidden
						className="inline-flex shrink-0 items-center justify-center text-white [&_svg]:h-[50%] [&_svg]:w-[50%]"
						style={{
							width: appIconSizes[size],
							height: appIconSizes[size],
							background: color.value,
							borderRadius: appIconSizes[size] * 0.2237,
						}}
					>
						{iconMap[glyph]}
					</span>
				</Preview>
			</div>
			<div className="flex items-end justify-center gap-8">
				{sizes.map((preset) => (
					<Preview key={preset} label={`${preset} · ${appIconSizes[preset]}px`}>
						<AppIcon size={preset} color="#34C759" icon={<CheckIcon />} label={`${preset} 尺寸示例`} />
					</Preview>
				))}
			</div>
		</div>
	)
}

export const appIconDoc = {
	id: 'app-icon',
	heading: 'AppIcon',
	description: 'App 图标底板。连续曲率 squircle 轮廓，颜色、大小、内部图标都由调用方传入。',
	nav: ['AppIcon'],
	Demo: AppIconDemo,
}
