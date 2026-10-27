import { useState } from 'react'
import {
	DotMatrix,
	type DotMatrixAlgorithm,
	type DotMatrixGrid,
	type DotMatrixShape,
	type DotMatrixSize,
} from '../ui/DotMatrix'
import { Preview, Segmented } from './frame'

const sizes = ['xs', 'sm', 'md', 'lg'] as const
const grids = ['3x3', '4x4'] as const
const shapes = ['round', 'rounded'] as const
const algorithms = ['chaotic', 'rotation'] as const

function DotMatrixDemo() {
	const [size, setSize] = useState<DotMatrixSize>('md')
	const [grid, setGrid] = useState<DotMatrixGrid>('3x3')
	const [shape, setShape] = useState<DotMatrixShape>('round')
	const [algorithm, setAlgorithm] = useState<DotMatrixAlgorithm>('chaotic')
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="flex flex-wrap gap-2">
				<Segmented value={size} options={sizes} onChange={setSize} />
				<Segmented value={grid} options={grids} onChange={setGrid} />
				<Segmented value={shape} options={shapes} onChange={setShape} />
				<Segmented value={algorithm} options={algorithms} onChange={setAlgorithm} />
			</div>
			<Preview label={`${size} / ${grid} / ${shape} / ${algorithm}`} className="w-full">
				<DotMatrix size={size} grid={grid} shape={shape} algorithm={algorithm} />
			</Preview>
		</div>
	)
}

export const dotMatrixDoc = {
	id: 'dot-matrix',
	heading: 'DotMatrix',
	description: '点阵加载。尺寸、栅格、点形、动画各用一组按钮切换，一次只看一种组合。',
	nav: ['DotMatrix'],
	Demo: DotMatrixDemo,
}
