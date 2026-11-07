import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { DemoButton } from './frame'

type Sample = 'one' | 'two' | 'labels' | 'okWait' | 'cancelWait'

const samples: { id: Sample; label: string }[] = [
	{ id: 'one', label: '只有确认' },
	{ id: 'two', label: '取消和确认' },
	{ id: 'labels', label: '改文案' },
	{ id: 'okWait', label: '确认等 4 秒' },
	{ id: 'cancelWait', label: '取消等 4 秒' },
]

function wait(ms: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

function DialogDemo() {
	const [sample, setSample] = useState<Sample>('one')
	const [open, setOpen] = useState(false)
	return (
		<div className="flex flex-wrap items-center justify-center gap-2">
			{samples.map((item) => (
				<DemoButton
					key={item.id}
					onClick={() => {
						setSample(item.id)
						setOpen(true)
					}}
				>
					{item.label}
				</DemoButton>
			))}
			<Dialog
				open={open}
				onOpenChange={setOpen}
				title="删除会话"
				body="删除后，这条会话会从列表里消失。"
				showCancel={sample !== 'one'}
				cancelText={sample === 'labels' ? '留下' : '取消'}
				confirmText={sample === 'labels' ? '继续' : '确认'}
				{...(sample === 'okWait' ? { onOk: () => wait(4000) } : {})}
				{...(sample === 'cancelWait' ? { onCancel: () => wait(4000) } : {})}
			/>
		</div>
	)
}

export const dialogDoc = {
	id: 'dialog',
	heading: 'Dialog',
	description: '带标题和按钮的确认框。只有返回 Promise 的回调才会让按钮转圈，结束才关。',
	nav: ['Dialog'],
	Demo: DialogDemo,
}
