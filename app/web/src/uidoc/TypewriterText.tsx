import { useState } from 'react'
import { TypewriterText } from '../ui/TypewriterText'
import { Preview, Segmented } from './frame'

const modes = ['播放', '停'] as const
const sample = '逐字出现的一段说明，用来看打字机速度。'

function TypewriterTextDemo() {
	const [mode, setMode] = useState<(typeof modes)[number]>('播放')
	const [run, setRun] = useState(0)
	return (
		<Preview label="纯文本" bodyClassName="flex-col gap-4">
			<Segmented
				value={mode}
				options={modes}
				onChange={(next) => {
					setMode(next)
					if (next === '播放') setRun((value) => value + 1)
				}}
			/>
			<TypewriterText key={run} text={sample} playing={mode === '播放'} />
		</Preview>
	)
}

export const typewriterTextDoc = {
	id: 'typewriter-text',
	heading: 'TypewriterText',
	description: '纯文本打字机。播放从头走一遍，停则整段显示。',
	nav: ['TypewriterText'],
	Demo: TypewriterTextDemo,
}
