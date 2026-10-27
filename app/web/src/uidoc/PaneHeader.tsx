import { CloseIcon } from '../icons'
import { IconButton } from '../ui/IconButton'
import { PaneHeader } from '../ui/PaneHeader'
import { Preview } from './frame'

function PaneHeaderDemo() {
	return (
		<Preview label="顶栏" bodyClassName="items-stretch p-0">
			<div className="w-full">
				<PaneHeader
					left={<span className="truncate px-1 text-sm text-fg">文件</span>}
					right={
						<IconButton title="关闭">
							<CloseIcon />
						</IconButton>
					}
				/>
				<div className="px-3 py-4 text-sm text-fg-3">顶栏下面的内容</div>
			</div>
		</Preview>
	)
}

export const paneHeaderDoc = {
	id: 'pane-header',
	heading: 'PaneHeader',
	description: '固定高度的面板顶栏，左边标题，右边一个图标按钮。',
	nav: ['PaneHeader'],
	Demo: PaneHeaderDemo,
}
