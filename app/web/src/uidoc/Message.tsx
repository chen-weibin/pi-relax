import { useState } from 'react'
import { useMessage } from '../hooks/useMessage'
import { Input } from '../ui/Input'
import { Segmented } from '../ui/Segmented'
import { DemoButton } from './frame'

const durations = ['默认 2s', '1s', '5s', '10s', '30s'] as const
type DurationKey = (typeof durations)[number]

// undefined = 不传 duration,走 MessageToaster 上的全局时长(2000)
const DURATION_MS: Record<DurationKey, number | undefined> = {
	'默认 2s': undefined,
	'1s': 1000,
	'5s': 5000,
	'10s': 10000,
	'30s': 30000,
}

const LONG_TEXT =
	'这是一条很长的消息,用来测试文本超过卡片宽度时的截断表现,以及多条堆叠时卡片高度的变化。'

const TYPE_TEXT = {
	success: '已保存',
	error: '删除失败',
	warning: '磁盘空间不足',
	info: '正在同步',
	normal: '已更新',
} as const

function MessageDemo() {
	const { show, holder } = useMessage()
	const [duration, setDuration] = useState<DurationKey>('默认 2s')
	const [text, setText] = useState<string>(TYPE_TEXT.success)
	const ms = DURATION_MS[duration]

	const send = (type: keyof typeof TYPE_TEXT) =>
		show(text.trim() || TYPE_TEXT[type], { type, duration: ms })

	return (
		<div className="mx-auto flex w-full max-w-md min-w-0 flex-col items-center gap-4">
			<Segmented size="sm" value={duration} options={durations} onChange={setDuration} />

			<div className="w-full max-w-72">
				<Input value={text} onChange={setText} placeholder="消息文本" allowClear />
			</div>

			<div className="flex flex-wrap items-center justify-center gap-2">
				<DemoButton onClick={() => send('success')}>成功</DemoButton>
				<DemoButton onClick={() => send('error')}>失败</DemoButton>
				<DemoButton onClick={() => send('warning')}>警告</DemoButton>
				<DemoButton onClick={() => send('info')}>提示</DemoButton>
				<DemoButton onClick={() => send('normal')}>普通</DemoButton>
				<DemoButton onClick={() => show(LONG_TEXT, { type: 'info', duration: ms })}>长文本</DemoButton>
			</div>

			<p className="w-full text-center text-sm text-fg-3">
				当前配置:duration = {ms ?? 2000}ms{ms === undefined ? '(默认)' : ''} · type 由按钮决定 · text ={' '}
				{text.trim() || '(空,回退到类型默认文案)'}
			</p>

			{holder}
		</div>
	)
}

export const messageDoc = {
	id: 'message',
	heading: 'Message',
	description: '顶部居中的短消息。左侧彩色图标块,右侧一行文字,默认 2 秒后自动消失。',
	nav: ['Message'],
	Demo: MessageDemo,
}
