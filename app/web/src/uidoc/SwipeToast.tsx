import { useState } from 'react'
import { useToast } from '../hooks/useToast'
import { Segmented } from '../ui/Segmented'
import type { SwipeToastCloseReason } from '../ui/SwipeToast'
import { DemoButton } from './frame'

const durations = ['4s', '8s', '常驻'] as const
const DURATION = { '4s': 4000, '8s': 8000, '常驻': 0 } as const

function SwipeToastDemo() {
	const { show, holder } = useToast()
	const [duration, setDuration] = useState<(typeof durations)[number]>('4s')
	const [reason, setReason] = useState<SwipeToastCloseReason | null>(null)

	const pop = (options: { title: string; description: string }) =>
		show({
			...options,
			actionLabel: '关闭',
			duration: DURATION[duration],
			onClose: setReason,
		})

	return (
		<div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
			<Segmented size="sm" value={duration} options={durations} onChange={setDuration} />

			<div className="flex flex-wrap items-center justify-center gap-2">
				<DemoButton
					onClick={() =>
						pop({
							title: '文件已归档',
							description: '按住卡片往下拖可以提前关掉它',
						})
					}
				>
					弹一条
				</DemoButton>
					<DemoButton
						onClick={() =>
							pop({
								title: '文件已归档到「工作 / 归档 / 2026 年第四季度」目录',
								description:
									'这是一条很长的描述,用来演示最多只显示两行、超出部分用省略号截断的效果,剩下的内容不会把卡片撑高,也不会把右边的按钮挤走,标题也会跟着单行截断。',
							})
						}
					>
						弹一条(长文本)
					</DemoButton>
			</div>

			<p className="text-center text-sm text-fg-3">
				连点可以叠多条,都浮在视口右下角 · 关闭原因:{reason ?? '—'}
			</p>

			{holder}
		</div>
	)
}

export const swipeToastDoc = {
	id: 'swipe-toast',
	heading: 'SwipeToast',
	description:
		'可下滑关闭的浮层提示。卡片下沿烧一根引信表示剩余时间,烧完自动消失;悬停 / 聚焦时引信暂停。',
	nav: ['SwipeToast'],
	Demo: SwipeToastDemo,
}
