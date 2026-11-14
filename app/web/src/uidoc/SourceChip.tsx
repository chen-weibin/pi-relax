import { useState } from 'react'
import { Segmented } from '../ui/Segmented'
import { SourceChip } from '../ui/SourceChip'
import type { SiteMarkSize } from '../ui/SiteMark'
import { Preview } from './frame'

const sizeOptions = ['sm', 'md', 'lg', '28', '36'] as const
type SizeOption = (typeof sizeOptions)[number]

const sizeValue: Record<SizeOption, SiteMarkSize | number> = {
	sm: 'sm',
	md: 'md',
	lg: 'lg',
	'28': 28,
	'36': 36,
}

function SourceChipDemo() {
	const [sizeOption, setSizeOption] = useState<SizeOption>('md')
	const size = sizeValue[sizeOption]
	return (
		<div className="grid w-full grid-cols-1 gap-4">
			<div className="flex justify-start px-4">
				<Segmented size="sm" value={sizeOption} options={sizeOptions} onChange={setSizeOption} />
			</div>
			<Preview label="段落后面" bodyClassName="justify-start px-4">
				<div className="max-w-md text-base text-fg">
					<p>Pi is an open-source coding agent for the terminal.</p>
					<div className="mt-2">
						<SourceChip
							name="Pi"
							src="https://pi.dev/favicon.ico"
							size={size}
							tooltip="https://pi.dev/docs/latest"
							onClick={() => {
								console.log({ name: 'Pi', url: 'https://pi.dev/docs/latest' })
							}}
						/>
					</div>
				</div>
			</Preview>
			<Preview label="可点击，悬停看链接" bodyClassName="justify-start px-4">
				<SourceChip
					name="Quickstart"
					src="https://github.com/favicon.ico"
					size={size}
					tooltip="https://github.com/"
					onClick={() => {
						console.log({ name: 'Quickstart', url: 'https://github.com/' })
					}}
				/>
			</Preview>
			<Preview label="不可点，没有 tooltip" bodyClassName="justify-start px-4">
				<SourceChip name="Notes" src={null} size={size} />
			</Preview>
			<Preview label="className / style" bodyClassName="justify-start px-4">
				<SourceChip
					name="自定义"
					src="https://github.com/favicon.ico"
					size={size}
					className="ring-1 ring-fg-3"
					style={{ backgroundColor: '#111111', color: '#f5f5f5' }}
				/>
			</Preview>
		</div>
	)
}

export const sourceChipDoc = {
	id: 'source-chip',
	heading: 'SourceChip',
	description: '来源胶囊：左圆图贴齐高度，右为名称。可点、tooltip、大小、className 和 style 都可改。',
	nav: ['SourceChip'],
	Demo: SourceChipDemo,
}
