import { useState } from 'react'
import { Modal, type ModalAlign } from '../ui/Modal'
import { Segmented } from '../ui/Segmented'
import { DemoButton } from './frame'

const aligns = ['center', 'top'] as const

function ModalDemo() {
	const [open, setOpen] = useState(false)
	const [align, setAlign] = useState<ModalAlign>('center')
	return (
		<div className="flex flex-col items-center gap-3">
			<Segmented size="sm" value={align} options={aligns} onChange={setAlign} />
			<DemoButton onClick={() => setOpen(true)}>打开</DemoButton>
			<Modal open={open} onOpenChange={setOpen} align={align}>
				<div className="w-72 p-4">
					<p className="text-sm text-fg">对话框</p>
					<p className="mt-1 text-sm text-fg-3">当前对齐是 {align}。点遮罩或按 Esc 关闭。</p>
				</div>
			</Modal>
		</div>
	)
}

export const modalDoc = {
	id: 'modal',
	heading: 'Modal',
	description: '遮罩对话框。用按钮切换居中或靠上，再打开看位置。',
	nav: ['Modal'],
	Demo: ModalDemo,
}
