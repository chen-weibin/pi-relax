import classNames from 'classnames'
import { motion } from 'motion/react'

export type DotMatrixSize = 'xs' | 'sm' | 'md' | 'lg'
export type DotMatrixGrid = '3x3' | '4x4'
export type DotMatrixShape = 'round' | 'rounded'
export type DotMatrixAlgorithm = 'chaotic' | 'rotation'

export type DotMatrixProps = {
	size?: DotMatrixSize
	grid?: DotMatrixGrid
	shape?: DotMatrixShape
	algorithm?: DotMatrixAlgorithm
	className?: string
	label?: string
}

const TOTAL_PX: Record<DotMatrixSize, number> = { xs: 12, sm: 16, md: 20, lg: 24 }

type CellConfig = {
	cols: number
	cellPx: number
	dotPx: number
	radiusPx: number
}

const CONFIG: Record<DotMatrixGrid, Record<DotMatrixSize, CellConfig>> = {
	'3x3': {
		xs: { cols: 3, cellPx: 4, dotPx: 3, radiusPx: 1 },
		sm: { cols: 3, cellPx: 16 / 3, dotPx: 3.5, radiusPx: 1 },
		md: { cols: 3, cellPx: 20 / 3, dotPx: 4, radiusPx: 1.25 },
		lg: { cols: 3, cellPx: 8, dotPx: 5, radiusPx: 1.5 },
	},
	'4x4': {
		xs: { cols: 4, cellPx: 3, dotPx: 2.5, radiusPx: 0.75 },
		sm: { cols: 4, cellPx: 4, dotPx: 3, radiusPx: 0.75 },
		md: { cols: 4, cellPx: 5, dotPx: 3.5, radiusPx: 1 },
		lg: { cols: 4, cellPx: 6, dotPx: 4, radiusPx: 1 },
	},
}

const DELAYS: Record<`${DotMatrixGrid}-${DotMatrixAlgorithm}`, number[]> = {
	'3x3-chaotic': [0, 173, 346, 519, 692, 65, 238, 411, 584],
	'4x4-chaotic': [0, 173, 346, 519, 692, 65, 238, 411, 584, 757, 130, 303, 476, 649, 22, 195],
	'3x3-rotation': [650, 786, 122, 557, 373, 229, 464, 400, 336],
	'4x4-rotation': [650, 782, 99, 57, 634, 729, 64, 159, 595, 471, 307, 284, 478, 455, 409, 285],
}

const ANIM = {
	duration: 0.8,
	ease: 'easeInOut' as const,
	times: [0, 0.35, 1],
	repeat: Infinity,
}

export function DotMatrix({
	size = 'md',
	grid: gridType = '3x3',
	shape = 'rounded',
	algorithm = 'chaotic',
	className,
	label: ariaLabel = 'Loading',
}: DotMatrixProps) {
	const cfg = CONFIG[gridType][size]
	const totalPx = TOTAL_PX[size]
	const delays = DELAYS[`${gridType}-${algorithm}`]
	const count = cfg.cols * cfg.cols

	return (
		<div
			role="status"
			aria-label={ariaLabel}
			className={classNames('grid place-items-center', className)}
			style={{
				width: totalPx,
				height: totalPx,
				gridTemplateColumns: `repeat(${cfg.cols}, ${cfg.cellPx}px)`,
				gridTemplateRows: `repeat(${cfg.cols}, ${cfg.cellPx}px)`,
			}}
		>
			{Array.from({ length: count }, (_, i) => (
				<motion.span
					key={i}
					className="block"
					style={{
						width: cfg.dotPx,
						height: cfg.dotPx,
						borderRadius: shape === 'round' ? '50%' : `${cfg.radiusPx}px`,
						background: 'var(--fg-3)',
					}}
					animate={{ opacity: [0.2, 1, 0.2] }}
					transition={{
						...ANIM,
						delay: delays[i]! / 1000,
					}}
				/>
			))}
		</div>
	)
}