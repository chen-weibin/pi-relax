import { useState } from 'react'
import { MarkdownView } from '../ui/MarkdownView'
import { Segmented } from '../ui/Segmented'
import { Preview } from './frame'

const modes = ['static', 'streaming'] as const
const sample = `# 标题

一段 **加粗**、*斜体* 和 \`code\`。

- 第一项
- 第二项`

function MarkdownViewDemo() {
	const [mode, setMode] = useState<(typeof modes)[number]>('static')
	return (
		<Preview label="Markdown" bodyClassName="flex-col items-stretch gap-4">
			<Segmented size="sm" value={mode} options={modes} onChange={setMode} />
			<MarkdownView key={mode} text={sample} mode={mode} isAnimating={mode === 'streaming'} />
		</Preview>
	)
}

export const markdownViewDoc = {
	id: 'markdown-view',
	heading: 'MarkdownView',
	description: '同一段 Markdown。static 是定稿，streaming 打开流式动画。',
	nav: ['MarkdownView'],
	Demo: MarkdownViewDemo,
}
