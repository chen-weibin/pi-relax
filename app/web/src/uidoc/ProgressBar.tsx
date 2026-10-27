import { ProgressBar } from '../ui/ProgressBar'
import { Preview } from './frame'

function ProgressBarDemo() {
	return (
		<Preview label="0–100">
			<ProgressBar defaultValue={40} width={240} ariaLabel="进度" />
		</Preview>
	)
}

export const progressBarDoc = {
	id: 'progress-bar',
	heading: 'ProgressBar',
	description: '可拖动的范围条。拖滑块或点轨道改数值。',
	nav: ['ProgressBar'],
	Demo: ProgressBarDemo,
}
