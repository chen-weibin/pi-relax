import { useState } from 'react'
import { Spinner } from '../ui/Spinner'
import { Preview, Segmented } from './frame'

const sizes = ['12', '16', '26'] as const
const colors = ['current', 'fg-3', '#E5E5E5'] as const

function SpinnerDemo() {
	const [size, setSize] = useState<(typeof sizes)[number]>('16')
	const [color, setColor] = useState<(typeof colors)[number]>('current')
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Segmented value={size} options={sizes} onChange={setSize} />
				<Segmented value={color} options={colors} onChange={setColor} />
			</div>
			<Preview label={`${size}px · ${color}`}>
				<Spinner size={Number(size)} {...(color === 'current' ? {} : { color: color === 'fg-3' ? 'var(--fg-3)' : color })} />
			</Preview>
		</div>
	)
}

export const spinnerDoc = {
	id: 'spinner',
	heading: 'Spinner',
	description: '圆锥渐变转圈。可改大小和颜色，当图标用。',
	nav: ['Spinner'],
	Demo: SpinnerDemo,
}
