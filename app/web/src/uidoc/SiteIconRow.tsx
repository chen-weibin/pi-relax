import { useState } from 'react'
import { Segmented } from '../ui/Segmented'
import { SiteIconRow, type SiteIcon } from '../ui/SiteIconRow'
import type { SiteMarkSize } from '../ui/SiteMark'
import { DemoButton, Preview } from './frame'

const sizeOptions = ['sm', 'md', 'lg', '28', '36'] as const
type SizeOption = (typeof sizeOptions)[number]

const sizeValue: Record<SizeOption, SiteMarkSize | number> = {
	sm: 'sm',
	md: 'md',
	lg: 'lg',
	'28': 28,
	'36': 36,
}

function letter(name: string, extra?: Partial<SiteIcon>): SiteIcon {
	return { name, url: `https://example.invalid/${name}`, src: null, ...extra }
}

function avatar(name: string, extra?: Partial<SiteIcon>): SiteIcon {
	const src = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name)}`
	return { name, url: src, src, ...extra }
}

const letters = ['Pi', 'Git', 'MDN', 'Web', 'Doc', 'Lab'].map((name) => letter(name))
const faces = ['Ava', 'Noah', 'Mia', 'Leo', 'Ivy', 'Owen'].map((name) => avatar(name))
const restFaces = Array.from({ length: 14 }, (_, index) => avatar(`N${index + 1}`))
const lineOptions = ['单行', '多行'] as const

function addedLetter(index: number): SiteIcon {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	const name = `${alphabet[index % alphabet.length]}${index >= alphabet.length ? Math.floor(index / alphabet.length) : ''}`
	return letter(name)
}

function WrapLab({ size }: { size: SiteMarkSize | number }) {
	const [line, setLine] = useState<(typeof lineOptions)[number]>('多行')
	const [count, setCount] = useState(6)
	const sites = Array.from({ length: count }, (_, index) => addedLetter(index))
	return (
		<div className="flex w-full min-w-0 flex-col items-start gap-3">
			<div className="flex items-center gap-2">
				<Segmented size="sm" value={line} options={lineOptions} onChange={setLine} />
				<DemoButton
					onClick={() => {
						setCount((value) => value + 1)
					}}
				>
					添加
				</DemoButton>
			</div>
			<div className="w-full min-w-0">
				<SiteIconRow sites={sites} size={size} wrap={line === '多行'} />
			</div>
		</div>
	)
}

function SiteIconRowDemo() {
	const [sizeOption, setSizeOption] = useState<SizeOption>('md')
	const size = sizeValue[sizeOption]
	return (
		<div className="grid w-full grid-cols-1 gap-4">
			<div className="flex justify-start px-4">
				<Segmented size="sm" value={sizeOption} options={sizeOptions} onChange={setSizeOption} />
			</div>
			<Preview label="首字母 · 三个，悬停散开" bodyClassName="justify-start px-4">
				<SiteIconRow sites={letters.slice(0, 3)} size={size} />
			</Preview>
			<Preview label="头像 · 六个，最多四个圆" bodyClassName="justify-start px-4">
				<SiteIconRow sites={faces} max={4} size={size} />
			</Preview>
			<Preview label="首字母 · 两个，不出现数字" bodyClassName="justify-start px-4">
				<SiteIconRow sites={letters.slice(0, 2)} max={4} size={size} />
			</Preview>
			<Preview label="头像 · 单行，最多五个圆" bodyClassName="justify-start px-4">
				<SiteIconRow sites={faces} max={5} size={size} />
			</Preview>
			<Preview label="添加后，多行时一行放不下才换行" bodyClassName="justify-start px-4">
				<WrapLab size={size} />
			</Preview>
			<Preview label="头像 · 悬停 +N 铺开剩余" bodyClassName="justify-start px-4">
				<SiteIconRow sites={restFaces} max={4} size={size} overflowHover />
			</Preview>
			<Preview label="首字母 · className / style" bodyClassName="justify-start px-4">
				<SiteIconRow
					sites={letters.slice(0, 3)}
					size={size}
					className="rounded-md bg-surface px-2 py-1"
					style={{ opacity: 0.9 }}
				/>
			</Preview>
			<Preview label="头像 · 部分可点，部分带 Tooltip" bodyClassName="justify-start px-4">
				<SiteIconRow
					sites={[
						avatar('Ava', {
							tooltip: 'Ava',
							onClick: () => {
								console.log('Ava')
							},
						}),
						avatar('Noah', { tooltip: 'Noah' }),
						avatar('Mia', {
							clickable: true,
							onClick: () => {
								console.log('Mia')
							},
						}),
						avatar('Leo'),
					]}
					size={size}
				/>
			</Preview>
			<Preview label="首字母 · 只有一颗可点" bodyClassName="justify-start px-4">
				<SiteIconRow
					sites={[
						letter('Pi', {
							tooltip: 'Pi',
							onClick: () => {
								console.log('Pi')
							},
						}),
					]}
					size={size}
				/>
			</Preview>
		</div>
	)
}

export const siteIconRowDoc = {
	id: 'site-icon-row',
	heading: 'SiteIconRow',
	description: '一排网站图标。单行重叠，靠后的盖在上面，悬停散开。超出 max 时最后一个圆是数字。多行时一行放不下才换行。悬停 +N 可铺开剩余图标。',
	nav: ['SiteIconRow'],
	Demo: SiteIconRowDemo,
}
