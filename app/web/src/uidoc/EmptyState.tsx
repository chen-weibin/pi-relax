import { FileIcon } from '../icons'
import { EmptyState } from '../ui/EmptyState'
import { Preview } from './frame'

function EmptyStateDemo() {
	return (
		<div className="flex flex-wrap items-start justify-center gap-8">
			<Preview label="居中" className="w-56" bodyClassName="h-40 border border-dashed border-border">
				<div className="h-full w-full">
					<EmptyState icon={<FileIcon />}>请选择要打开的文件</EmptyState>
				</div>
			</Preview>
			<Preview label="顶部" className="w-56" bodyClassName="h-40 border border-dashed border-border">
				<div className="h-full w-full">
					<EmptyState placement="top">工作目录为空</EmptyState>
				</div>
			</Preview>
		</div>
	)
}

export const emptyStateDoc = {
	id: 'empty-state',
	heading: 'EmptyState',
	description: '一块区域还没有内容。图标和文案由调用方传入，可居中或贴在顶部。',
	nav: ['EmptyState'],
	Demo: EmptyStateDemo,
}
