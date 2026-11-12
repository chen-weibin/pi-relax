import { useState } from 'react'
import { FileTsIcon } from '../icons'
import { DiffView, type DiffSource } from '../ui/DiffView'
import { Segmented } from '../ui/Segmented'
import { Switch } from '../ui/Switch'
import { Preview } from './frame'

const OLD_FILE = `import type { PlazaWorkItem } from '../types'

export const MOCK_PLAZA_WORKS: PlazaWorkItem[] = [
  { id: 'w-1', title: '夜跑', votes: 12 },
  { id: 'w-2', title: '晨读', votes: 8 },
]

export const MOCK_VOTE_CONFIG = {
  maxPerUser: 3,
  allowRepeat: false,
}
`

const NEW_FILE = `import type { PlazaWorkItem } from '../types'

export const MOCK_PLAZA_WORKS: PlazaWorkItem[] = [
  { id: 'w-1', title: '夜跑', votes: 12 },
  { id: 'w-2', title: '晨读', votes: 8 },
  { id: 'w-3', title: '写字', votes: 5 },
]

export const MOCK_VOTE_CONFIG = {
  maxPerUser: 5,
  allowRepeat: true,
}
`

/**
 * git 风格的 unified patch。
 * 写成数组再 join：空上下文行在 patch 里是一个空格，留在模板字符串里容易被格式化工具吃掉。
 */
const GIT_PATCH = [
	'diff --git a/src/plaza/mock.ts b/src/plaza/mock.ts',
	'--- a/src/plaza/mock.ts',
	'+++ b/src/plaza/mock.ts',
	'@@ -3,9 +3,10 @@',
	' export const MOCK_PLAZA_WORKS: PlazaWorkItem[] = [',
	"   { id: 'w-1', title: '夜跑', votes: 12 },",
	"   { id: 'w-2', title: '晨读', votes: 8 },",
	"+  { id: 'w-3', title: '写字', votes: 5 },",
	' ]',
	' ',
	' export const MOCK_VOTE_CONFIG = {',
	'-  maxPerUser: 3,',
	'-  allowRepeat: false,',
	'+  maxPerUser: 5,',
	'+  allowRepeat: true,',
	' }',
].join('\n')

const NEW_ONLY = `export type PlazaDetailFile = {
  id: string
  name: string
  sizeLabel: string
  // 静态阶段可为空，点击仅 toast 演示。
  downloadUrl?: string
}
`

/** 两处改动、中间一大段没动 —— 未改动块会被收成一行分隔条。 */
const MIDDLE_OLD = `import { usePlazaWorks } from '../hooks'

export function PlazaList() {
  const works = usePlazaWorks()
  const total = works.reduce((sum, w) => sum + w.votes, 0)

  return (
    <section className="plaza-list">
      <header className="plaza-list__header">
        <h2>广场</h2>
        <span className="plaza-list__count">{total} 票</span>
      </header>
      <ul className="plaza-list__items">
        {works.map((work) => (
          <li key={work.id} className="plaza-item">
            <PlazaItemTitle title={work.title} />
            <PlazaItemVotes votes={work.votes} />
          </li>
        ))}
      </ul>
      <footer className="plaza-list__footer">
        <PlazaFooter note="数据每 5 分钟刷新" />
      </footer>
    </section>
  )
}
`

const MIDDLE_NEW = `import { usePlazaWorks } from '../hooks'

export function PlazaList() {
  const works = usePlazaWorks()
  const total = works.reduce((sum, w) => sum + w.votes + (w.bonus ?? 0), 0)

  return (
    <section className="plaza-list">
      <header className="plaza-list__header">
        <h2>广场</h2>
        <span className="plaza-list__count">{total} 票</span>
      </header>
      <ul className="plaza-list__items">
        {works.map((work) => (
          <li key={work.id} className="plaza-item">
            <PlazaItemTitle title={work.title} />
            <PlazaItemVotes votes={work.votes} />
          </li>
        ))}
      </ul>
      <footer className="plaza-list__footer">
        <PlazaFooter note="数据每 5 分钟刷新" updatedAt={now} />
      </footer>
    </section>
  )
}
`

/** 库按引用比对这些对象，别在 render 里现造。 */
const PATCH_SOURCE: DiffSource = { kind: 'patch', patch: GIT_PATCH }
const VERSIONS_SOURCE: DiffSource = {
	kind: 'versions',
	old: { name: 'src/plaza/mock.ts', contents: OLD_FILE },
	new: { name: 'src/plaza/mock.ts', contents: NEW_FILE },
}
const MIDDLE_SOURCE: DiffSource = {
	kind: 'versions',
	old: { name: 'src/plaza/PlazaList.tsx', contents: MIDDLE_OLD },
	new: { name: 'src/plaza/PlazaList.tsx', contents: MIDDLE_NEW },
}
const FILE_SOURCE: DiffSource = { kind: 'file', name: 'src/plaza/types.ts', contents: NEW_ONLY }

/** 控件上显示中文，值用库的词。下面那张表把两边对上。 */
const layouts = ['堆叠', '分栏'] as const
const indicators = ['色调', '字符', '无'] as const
const inlineLevels = ['按词', '按字符', '无'] as const
const separators = ['行数', '元信息', '细条'] as const

const layoutValue = { 堆叠: 'unified', 分栏: 'split' } as const
const indicatorValue = { 色调: 'bars', 字符: 'classic', 无: 'none' } as const
const inlineValue = { 按词: 'word-alt', 按字符: 'char', 无: 'none' } as const
const separatorValue = { 行数: 'line-info', 元信息: 'metadata', 细条: 'simple' } as const

function DiffViewDemo() {
	const [layout, setLayout] = useState<(typeof layouts)[number]>('堆叠')
	const [indicator, setIndicator] = useState<(typeof indicators)[number]>('色调')
	const [inlineLevel, setInlineLevel] = useState<(typeof inlineLevels)[number]>('按词')
	const [separator, setSeparator] = useState<(typeof separators)[number]>('行数')
	const [lineNumbers, setLineNumbers] = useState(true)
	const [background, setBackground] = useState(true)
	const [wrap, setWrap] = useState(false)
	const [customIcon, setCustomIcon] = useState(true)

	const options = {
		diffStyle: layoutValue[layout],
		diffIndicators: indicatorValue[indicator],
		lineDiffType: inlineValue[inlineLevel],
		hunkSeparators: separatorValue[separator],
		disableLineNumbers: !lineNumbers,
		disableBackground: !background,
		overflow: wrap ? ('wrap' as const) : ('scroll' as const),
	}

	const card = 'w-full overflow-hidden rounded-lg border border-border'

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
				<div className="flex items-center gap-2">
					<span className="text-sm text-fg-3">布局</span>
					<Segmented size="sm" value={layout} options={layouts} onChange={setLayout} />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-fg-3">标记</span>
					<Segmented size="sm" value={indicator} options={indicators} onChange={setIndicator} />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-fg-3">行内</span>
					<Segmented size="sm" value={inlineLevel} options={inlineLevels} onChange={setInlineLevel} />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-fg-3">分隔</span>
					<Segmented size="sm" value={separator} options={separators} onChange={setSeparator} />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-fg-3">行号</span>
					<Switch checked={lineNumbers} onChange={setLineNumbers} ariaLabel="显示行号" />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-fg-3">底色</span>
					<Switch checked={background} onChange={setBackground} ariaLabel="增删行铺底色" />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-fg-3">折行</span>
					<Switch checked={wrap} onChange={setWrap} ariaLabel="长行折行" />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-fg-3">外部图标</span>
					<Switch checked={customIcon} onChange={setCustomIcon} ariaLabel="文件头用外部图标" />
				</div>
			</div>

			<div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-fg-disabled">
				<span>diffStyle：{layoutValue[layout]}</span>
				<span>diffIndicators：{indicatorValue[indicator]}</span>
				<span>lineDiffType：{inlineValue[inlineLevel]}</span>
				<span>hunkSeparators：{separatorValue[separator]}</span>
				<span>行号：{lineNumbers ? '开' : '关'}</span>
				<span>底色：{background ? '开' : '关'}</span>
				<span>折行：{wrap ? '开' : '关'}</span>
				<span>外部图标：{customIcon ? '开' : '关'}</span>
			</div>

			<Preview label="unified patch（git 风格）" bodyClassName="p-0">
				<DiffView
					source={PATCH_SOURCE}
					options={options}
					headerIcon={customIcon ? <FileTsIcon /> : undefined}
					className={card}
				/>
			</Preview>

			<Preview label="同一文件的两个版本" bodyClassName="p-0">
				<DiffView
					source={VERSIONS_SOURCE}
					options={options}
					headerIcon={customIcon ? <FileTsIcon /> : undefined}
					className={card}
				/>
			</Preview>

			<Preview label="中间有折叠（中间那段没改动，收成一行分隔条）" bodyClassName="p-0">
				<DiffView
					source={MIDDLE_SOURCE}
					options={options}
					headerIcon={customIcon ? <FileTsIcon /> : undefined}
					className={card}
				/>
			</Preview>

			<Preview label="单文件（不标 +/-）" bodyClassName="p-0">
				<DiffView
					source={FILE_SOURCE}
					options={options}
					headerIcon={customIcon ? <FileTsIcon /> : undefined}
					className={card}
				/>
			</Preview>
		</div>
	)
}

export const diffViewDoc = {
	id: 'diff-view',
	heading: 'DiffView',
	description: '渲染 diff 和代码对比。吃 unified patch、同一文件的两个版本、或单份文件三种来源。',
	nav: ['DiffView'],
	Demo: DiffViewDemo,
}
