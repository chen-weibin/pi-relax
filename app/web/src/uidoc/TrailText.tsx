import { TrailText } from '../ui/TrailText'
import { Preview } from './frame'

function TrailTextDemo() {
	return (
		<div className="grid grid-cols-2 gap-4">
			<Preview label="标题旁">
				<span className="inline-flex items-baseline gap-2">
					探索
					<TrailText text="2 个工具" />
				</span>
			</Preview>
			<Preview label="扫光">
				<TrailText text="2 个工具" shimmer />
			</Preview>
		</div>
	)
}

export const trailTextDoc = {
	id: 'trail-text',
	heading: 'TrailText',
	description: '标题后面的辅文。左边挂在标题旁，右边单独扫光。',
	nav: ['TrailText'],
	Demo: TrailTextDemo,
}
