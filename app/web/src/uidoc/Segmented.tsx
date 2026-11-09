import { useState } from 'react'
import { Segmented, type SegmentedSize, type SegmentedVariant } from '../ui/Segmented'
import { Preview } from './frame'

const placements = ['top', 'bottom', 'left', 'right'] as const
const sizes: SegmentedSize[] = ['sm', 'md', 'lg']
const variants: SegmentedVariant[] = ['default', 'inverse']

function SegmentedDemo() {
	const [placement, setPlacement] = useState<(typeof placements)[number]>('top')
	const [size, setSize] = useState<SegmentedSize>('md')
	const [variant, setVariant] = useState<SegmentedVariant>('default')
	return (
		<div className="flex flex-col gap-6">
			<Preview label="滑动(连点看过渡)">
				<Segmented
					value={placement}
					options={placements}
					onChange={setPlacement}
					size={size}
					variant={variant}
				/>
			</Preview>
			<Preview label="尺寸">
				<div className="flex flex-wrap items-end justify-center gap-3">
					{sizes.map((item) => (
						<Segmented
							key={item}
							size={item}
							value={placement}
							options={placements}
							onChange={setPlacement}
						/>
					))}
				</div>
			</Preview>
			<Preview label="样式">
				<div className="flex flex-wrap items-center justify-center gap-3">
					{variants.map((item) => (
						<Segmented
							key={item}
							variant={item}
							value={placement}
							options={placements}
							onChange={setPlacement}
						/>
					))}
				</div>
			</Preview>
			<Preview label="控制">
				<div className="flex flex-wrap items-center justify-center gap-6">
					<div className="flex items-center gap-2">
						<span className="text-sm text-fg-3">尺寸</span>
						<Segmented
							size="sm"
							value={size}
							options={sizes}
							onChange={setSize}
						/>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-fg-3">样式</span>
						<Segmented
							size="sm"
							value={variant}
							options={variants}
							onChange={setVariant}
						/>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-fg-3">非受控</span>
						<Segmented size="sm" defaultValue="top" options={placements} />
					</div>
				</div>
			</Preview>
		</div>
	)
}

export const segmentedDoc = {
	id: 'segmented',
	heading: 'Segmented',
	description: '分段控件。选中胶囊会滑动过去,三档尺寸、两种胶囊样式。',
	nav: ['Segmented'],
	Demo: SegmentedDemo,
}
