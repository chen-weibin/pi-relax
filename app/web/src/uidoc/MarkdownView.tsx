import { useEffect, useState, type ReactNode } from 'react'
import { MarkdownView } from '../ui/MarkdownView'
import type { SourceOptions } from '../ui/MarkdownView/plugins/source'
import { sourceDirective } from '../ui/MarkdownView/plugins/source/remark.ts'
import { Segmented } from '../ui/Segmented'
import { DemoButton, Preview } from './frame'

const modes = ['静态', '流式'] as const
const clickModes = ['新标签', '当前页', '自定义'] as const

const prose = `# 回答

一段 **加粗**、*斜体* 和行内 \`code\`。详见 [文档](https://pi.dev/)。

- 第一项
- 第二项

> 引用保持左侧色条。
`

const code = `围栏带行号。流式时先有代码外壳，高亮在这段写完后补上。

\`\`\`ts
export function greet(name: string) {
  return \`hi \${name}\`
}
\`\`\`
`

const math = `块级公式用 \`$$\`。

$$
E = mc^2
$$
`

const diagram = `\`\`\`mermaid
graph LR
  A[定稿] --> B[流式]
\`\`\`
`

const sources = `依据 ${sourceDirective('Pi', 'https://pi.dev/docs/latest')} 和 ${sourceDirective('Streamdown', 'https://github.com/vercel/streamdown')}。

:note[这条不是来源] 会原样留下。
`

const thinking = `先看约束，再决定要不要改接口。

- 视图不写某个扩展的节点
- 扩展放在 plugins
`

const plain = `\`highlight={false}\` 时围栏不当代码块，这段不跟上面的流式开关。

\`\`\`ts
const n = 1
\`\`\`
`

const unclosed = `写入过程中会补上未闭合的 **加粗，以及下面的代码块：

\`\`\`ts
const n = 1
`

function useTyped(full: string, run: number, on: boolean) {
	const [count, setCount] = useState(on ? 0 : full.length)
	const [tick, setTick] = useState({ full, run, on })
	if (tick.full !== full || tick.run !== run || tick.on !== on) {
		setTick({ full, run, on })
		setCount(on ? 0 : full.length)
	}
	useEffect(() => {
		if (!on) return
		let n = 0
		const step = Math.max(1, Math.ceil(full.length / 48))
		const id = window.setInterval(() => {
			n = Math.min(full.length, n + step)
			setCount(n)
			if (n >= full.length) window.clearInterval(id)
		}, 40)
		return () => window.clearInterval(id)
	}, [full, on, run])
	return { text: full.slice(0, count), streaming: on && count < full.length }
}

function Sample({
	label,
	text,
	run,
	follow,
	className,
	highlight,
	source,
	toolbar,
}: {
	label: string
	text: string
	run: number
	follow: boolean
	className?: string
	highlight?: boolean
	source?: SourceOptions
	toolbar?: ReactNode
}) {
	const typed = useTyped(text, run, follow)
	return (
		<Preview label={label} className="w-full items-stretch" bodyClassName="flex-col items-stretch justify-start gap-3">
			{toolbar}
			<MarkdownView
				text={typed.text}
				live={follow}
				streaming={typed.streaming}
				isAnimating={typed.streaming}
				highlight={highlight}
				source={source}
				className={className}
			/>
		</Preview>
	)
}

function MarkdownViewDemo() {
	const [mode, setMode] = useState<(typeof modes)[number]>('静态')
	const [run, setRun] = useState(0)
	const [clickMode, setClickMode] = useState<(typeof clickModes)[number]>('新标签')
	const follow = mode === '流式'
	const source: SourceOptions | undefined =
		clickMode === '当前页'
			? { openInNewTab: false }
			: clickMode === '自定义'
				? { onClick: (item) => console.log(item) }
				: undefined
	return (
		<div className="flex w-full flex-col gap-8">
			<div className="flex items-center justify-center gap-3">
				<Segmented size="sm" value={mode} options={modes} onChange={setMode} />
				{follow ? <DemoButton onClick={() => setRun((n) => n + 1)}>再播</DemoButton> : null}
			</div>
			<Sample label="正文" text={prose} run={run} follow={follow} />
			<Sample label="代码" text={code} run={run} follow={follow} />
			<Sample label="公式" text={math} run={run} follow={follow} />
			<Sample label="图" text={diagram} run={run} follow={follow} />
			<Sample
				label="行内来源"
				text={sources}
				run={run}
				follow={follow}
				source={source}
				toolbar={<Segmented size="sm" value={clickMode} options={clickModes} onChange={setClickMode} />}
			/>
			<Sample label="思考" text={thinking} run={run} follow={follow} className="markdown-view--dim" />
			<Sample label="未闭合" text={unclosed} run={run} follow={follow} />
			<Sample label="不高亮" text={plain} run={run} follow={false} highlight={false} />
		</div>
	)
}

export const markdownViewDoc = {
	id: 'markdown-view',
	heading: 'MarkdownView',
	description:
		'静态是定稿。流式模拟对话里的 live：边写边补未闭合语法，代码先有外壳，这段结束后再挂 Mermaid。不高亮那一段始终是静态。',
	nav: ['MarkdownView'],
	Demo: MarkdownViewDemo,
}
