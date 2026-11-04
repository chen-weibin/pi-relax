import { useState } from 'react'
import { FlipText } from '../ui/FlipText'
import { DemoButton, Preview } from './frame'

const lines = ['正在规划下一步行动', '思考', 'write'] as const

function FlipTextDemo() {
	const [index, setIndex] = useState(0)
	const text = lines[index] ?? lines[0]
	return (
		<Preview label="上翻 + 扫光" bodyClassName="flex-col items-start gap-4">
			<FlipText text={text} shimmer />
			<DemoButton onClick={() => setIndex((value) => (value + 1) % lines.length)}>下一句</DemoButton>
		</Preview>
	)
}

export const flipTextDoc = {
	id: 'flip-text',
	heading: 'FlipText',
	description: '一行文字向上翻出。点「下一句」看旧字离开、新字进来，当前行带扫光。',
	nav: ['FlipText'],
	Demo: FlipTextDemo,
}
