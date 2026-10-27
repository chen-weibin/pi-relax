import { StatusDot, type StatusDotKind } from '../ui/StatusDot'
import { Preview } from './frame'

const kinds: StatusDotKind[] = ['success', 'failure', 'normal']

function StatusDotDemo() {
	return (
		<div className="grid grid-cols-3 gap-4">
			{kinds.map((kind) => (
				<Preview key={kind} label={kind}>
					<StatusDot kind={kind} />
				</Preview>
			))}
		</div>
	)
}

export const statusDotDoc = {
	id: 'status-dot',
	heading: 'StatusDot',
	description: '单点状态。success、failure、normal 各一颗。',
	nav: ['StatusDot'],
	Demo: StatusDotDemo,
}
