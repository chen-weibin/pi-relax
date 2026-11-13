import { PathLink } from '../ui/PathLink'
import { Preview } from './frame'

function PathLinkDemo() {
	return (
		<div className="grid grid-cols-2 gap-4">
			<Preview label="标题旁">
				<span className="inline-flex items-baseline gap-2 text-fg-3">
					编辑
					<PathLink onClick={() => console.log('src/index.ts')}>index.ts</PathLink>
				</span>
			</Preview>
			<Preview label="单独">
				<PathLink onClick={() => console.log('/tmp/a.ts')}>a.ts</PathLink>
			</Preview>
		</div>
	)
}

export const pathLinkDoc = {
	id: 'path-link',
	heading: 'PathLink',
	description: '标题旁可点的文件名。hover 下划线；嵌在折叠行里不会误触展开。',
	nav: ['PathLink'],
	Demo: PathLinkDemo,
}
