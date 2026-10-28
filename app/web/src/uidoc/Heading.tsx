import type { ReactNode } from 'react'
import { Heading, type HeadingLevel } from '../ui/Heading'
import { textColors, textLeadings } from '../ui/textStyle'
import { Preview } from './frame'

const long = '这是一段故意写得很长的标题，用来看窄容器里会不会换行，或者在超出后收成省略号。'

const levels: HeadingLevel[] = [1, 2, 3, 4]

function Box({ label, children }: { label: string; children: ReactNode }) {
	return (
		<figure className="w-48">
			<figcaption className="mb-2 text-center text-sm text-fg-3">{label}</figcaption>
			<div className="w-full border border-dashed border-border px-2 py-1">{children}</div>
		</figure>
	)
}

function HeadingDemo() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col items-center gap-3">
				{levels.map((level) => (
					<Preview key={level} label={`level ${level}`}>
						<Heading level={level}>标题</Heading>
					</Preview>
				))}
			</div>
			<div className="mx-auto grid w-full max-w-md grid-cols-2 gap-x-8 gap-y-2">
				{textColors.map((color) => (
					<Heading key={color} level={4} color={color}>
						{color}
					</Heading>
				))}
			</div>
			<div className="mx-auto flex w-full max-w-md flex-col gap-3">
				{textLeadings.map((leading) => (
					<Heading key={leading} level={4} leading={leading}>
						{leading} 行高两行标题
						<br />
						第二行
					</Heading>
				))}
			</div>
			<div className="flex flex-wrap justify-center gap-6">
				<Box label="换行">
					<Heading level={4}>{long}</Heading>
				</Box>
				<Box label="单行省略">
					<Heading level={4} ellipsis tooltip>
						{long}
					</Heading>
				</Box>
				<Box label="两行省略">
					<Heading level={4} ellipsis={2} tooltip>
						{long}
					</Heading>
				</Box>
				<Box label="未溢出">
					<Heading level={4} ellipsis tooltip>
						短标题
					</Heading>
				</Box>
			</div>
			<Preview label="不占整行">
				<div className="text-sm text-fg-3">
					前缀 <Heading level={4} block={false}>行内标题</Heading> 后缀
				</div>
			</Preview>
		</div>
	)
}

export const headingDoc = {
	id: 'heading',
	heading: 'Heading',
	description: '标题。级别决定标签和字号，颜色走行文 token，可整行或行内，超出可省略，溢出后悬停看全文。',
	nav: ['Heading'],
	Demo: HeadingDemo,
}
