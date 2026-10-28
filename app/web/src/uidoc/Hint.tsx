import type { ReactNode } from 'react'
import { Hint } from '../ui/Hint'
import { Paragraph } from '../ui/Paragraph'
import { Preview } from './frame'

const long = '这是一条故意写得很长的辅助说明，窄容器里收成一行，悬停后可以看到没有被截掉的全文。'

function Box({ label, children }: { label: string; children: ReactNode }) {
	return (
		<figure className="w-48">
			<figcaption className="mb-2 text-center text-sm text-fg-3">{label}</figcaption>
			<div className="w-full border border-dashed border-border px-2 py-1">{children}</div>
		</figure>
	)
}

function HintDemo() {
	return (
		<div className="flex flex-col items-center gap-8">
			<div className="flex flex-col items-center gap-3">
				<Preview label="默认">
					<Hint>保存后立即生效</Hint>
				</Preview>
				<Preview label="对照正文">
					<div className="flex flex-col items-start gap-1">
						<Paragraph>正文 14px</Paragraph>
						<Hint>提示 12px</Hint>
					</div>
				</Preview>
			</div>
			<div className="flex flex-wrap justify-center gap-6">
				<Preview label="fg">
					<Hint color="fg">更明显</Hint>
				</Preview>
				<Preview label="error">
					<Hint color="error">路径不存在</Hint>
				</Preview>
			</div>
			<Box label="省略 + 悬停">
				<Hint ellipsis tooltip>
					{long}
				</Hint>
			</Box>
		</div>
	)
}

export const hintDoc = {
	id: 'hint',
	heading: 'Hint',
	description: '辅助说明。固定 12px，默认三级文字色，比正文更浅。颜色可改。输入框框下那一行仍用 Input 的 hint。',
	nav: ['Hint'],
	Demo: HintDemo,
}
