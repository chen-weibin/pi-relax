import { useState } from 'react'
import {
	ColorSwatch,
	colorSwatchSizes,
	DEFAULT_SWATCH_COLORS,
	type ColorSwatchSize,
	type ColorSwatchVariant,
} from '../ui/ColorSwatch'
import { Segmented } from '../ui/Segmented'
import { Preview } from './frame'

const sizes = Object.keys(colorSwatchSizes) as ColorSwatchSize[]
const variants = ['hollow', 'solid'] as const

function ColorSwatchDemo() {
	const [size, setSize] = useState<ColorSwatchSize>('md')
	const [variant, setVariant] = useState<ColorSwatchVariant>('hollow')
	const [color, setColor] = useState<string>(DEFAULT_SWATCH_COLORS[2]!)
	const [customOn, setCustomOn] = useState(true)
	const [own, setOwn] = useState<string>('#34c759')

	return (
		<div className="flex flex-col items-center gap-6">
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Segmented size="sm" value={size} options={sizes} onChange={setSize} />
				<Segmented size="sm" value={variant} options={variants} onChange={setVariant} />
				<Segmented
					size="sm"
					value={customOn ? 'custom' : 'presets'}
					options={['presets', 'custom'] as const}
					onChange={(next) => setCustomOn(next === 'custom')}
				/>
			</div>
			<Preview label={`默认 7 色${customOn ? ' + 自定义' : ''} · ${variant} · ${size} · ${color}`}>
				<div className="flex flex-col items-center gap-3">
					<ColorSwatch
						size={size}
						variant={variant}
						value={color}
						onChange={setColor}
						custom={customOn}
					/>
					<span
						className="h-8 w-8 rounded-full border border-border"
						style={{ background: color }}
						title={color}
					/>
				</div>
			</Preview>
			<Preview label="自定义色板 · 无取色器 · solid">
				<ColorSwatch
					colors={['#ff3b30', '#ff9500', '#34c759', '#007aff', '#af52de']}
					custom={false}
					variant="solid"
					value={own}
					onChange={setOwn}
					size="lg"
				/>
			</Preview>
			<div className="flex items-end justify-center gap-8">
				{sizes.map((preset) => (
					<Preview key={preset} label={`${preset} · ${colorSwatchSizes[preset]}px`}>
						<ColorSwatch size={preset} defaultValue={DEFAULT_SWATCH_COLORS[0]} custom={false} />
					</Preview>
				))}
			</div>
		</div>
	)
}

export const colorSwatchDoc = {
	id: 'color-swatch',
	heading: 'ColorSwatch',
	description: '一排环形色点选颜色。默认空心 7 色，可选实心与末尾取色器；也可整表换成自己的色板。',
	nav: ['ColorSwatch'],
	Demo: ColorSwatchDemo,
}
