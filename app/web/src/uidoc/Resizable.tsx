import { ResizableHandle } from '../ui/ResizableHandle'
import { ResizablePanel } from '../ui/ResizablePanel'
import { ResizablePanelGroup } from '../ui/ResizablePanelGroup'
import { Preview } from './frame'

function ResizableDemo() {
	return (
		<Preview label="拖中间的分隔条" bodyClassName="p-3">
			<div className="h-40 w-full">
				<ResizablePanelGroup id="uidoc-resizable" className="h-full w-full">
					<ResizablePanel id="uidoc-left" defaultSize={180} minSize={80}>
						<div className="flex h-full items-center justify-center text-sm text-fg-2">左栏</div>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel id="uidoc-right" minSize={80}>
						<div className="flex h-full items-center justify-center text-sm text-fg-2">右栏</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</Preview>
	)
}

export const resizableDoc = {
	id: 'resizable',
	heading: 'ResizablePanelGroup、ResizablePanel、ResizableHandle',
	description: '三个一起用：组、栏、分隔条。拖中间的线改左右宽度。',
	nav: ['ResizablePanelGroup', 'ResizablePanel', 'ResizableHandle'],
	Demo: ResizableDemo,
}
