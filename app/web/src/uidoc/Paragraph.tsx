import type { ReactNode } from 'react'
import { Paragraph, type ParagraphSize } from '../ui/Paragraph'
import { textColors, textLeadings } from '../ui/textStyle'
import { Preview } from './frame'

const long = '这是一段故意写得很长的正文，用来看窄容器里会不会换行，或者在超出后收成省略号。'

const sizes: ParagraphSize[] = ['sm', 'md', 'base']

function Box({ label, children }: { label: string; children: ReactNode }) {
	return (
		<figure className="w-48">
			<figcaption className="mb-2 text-center text-sm text-fg-3">{label}</figcaption>
			<div className="w-full border border-dashed border-border px-2 py-1">{children}</div>
		</figure>
	)
}

function ParagraphDemo() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col items-center gap-3">
				{sizes.map((size) => (
					<Preview key={size} label={size}>
						<Paragraph size={size}>正文</Paragraph>
					</Preview>
				))}
			</div>
			<div className="mx-auto grid w-full max-w-md grid-cols-2 gap-x-8 gap-y-2">
				{textColors.map((color) => (
					<Paragraph key={color} color={color}>
						{color}
					</Paragraph>
				))}
			</div>
			<div className="mx-auto flex w-full max-w-md flex-col gap-3">
				{textLeadings.map((leading) => (
					<Paragraph key={leading} leading={leading}>
						{leading} 行高。第二句用来把这一行撑开，方便对照松紧。
					</Paragraph>
				))}
			</div>
			<div className="flex flex-wrap justify-center gap-6">
				<Box label="换行">
					<Paragraph>{long}</Paragraph>
				</Box>
				<Box label="单行省略">
					<Paragraph ellipsis tooltip>
						{long}
					</Paragraph>
				</Box>
				<Box label="两行省略">
					<Paragraph ellipsis={2} tooltip>
						{long}
					</Paragraph>
				</Box>
				<Box label="未溢出">
					<Paragraph ellipsis tooltip>
						短正文
					</Paragraph>
				</Box>
			</div>
		</div>
	)
}

export const paragraphDoc = {
	id: 'paragraph',
	heading: 'Paragraph',
	description: '正文。三种字号，默认次文字色。换行、省略和溢出提示与标题相同。',
	nav: ['Paragraph'],
	Demo: ParagraphDemo,
}
