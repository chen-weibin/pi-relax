import { parseDiffFromFile } from '@pierre/diffs'
import { File, FileDiff, PatchDiff, type Hunk } from '@pierre/diffs/react'
import classNames from 'classnames'
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { headerCss } from './header'
import { diffThemeVars, useThemeType } from './theme'

/** 一份文件内容。`name` 决定语法高亮用的语言。 */
export type DiffSide = { name: string; contents: string }

/** diff 的来源。三种形态覆盖以后各种接法，业务侧不用知道底下是哪个库。 */
export type DiffSource =
	/** 标准 unified patch 文本（`git diff`、`diff -u`、工具产出的 patch）。 */
	| { kind: 'patch'; patch: string }
	/** 同一个文件的两个版本。任一侧可为 null（新增 / 删除）。 */
	| { kind: 'versions'; old: DiffSide | null; new: DiffSide | null }
	/** 单份文件，不标 +/-。 */
	| { kind: 'file'; name: string; contents: string }

export type DiffViewOptions = {
	/** 堆叠（unified）还是左右分栏（split）。 */
	diffStyle?: 'unified' | 'split'
	/** 增删行的标记：色调 / `+` `-` 字符 / 不要。 */
	diffIndicators?: 'bars' | 'classic' | 'none'
	/** 增删行铺底色。 */
	disableBackground?: boolean
	/** 行号。 */
	disableLineNumbers?: boolean
	/** 文件头（文件名 + 增删统计）。 */
	disableFileHeader?: boolean
	/** 未改动块之间的分隔样式。 */
	hunkSeparators?: 'line-info' | 'line-info-basic' | 'metadata' | 'simple'
	/** 改动行内部的高亮粒度。 */
	lineDiffType?: 'word-alt' | 'word-line' | 'word' | 'char' | 'none'
	/** 长行：横向滚动还是折行。 */
	overflow?: 'scroll' | 'wrap'
	/** 未改动块小于等于这个行数时不折叠。 */
	collapsedContextThreshold?: number
	/** 每次展开露出多少行。 */
	expansionLineCount?: number
	/** 未改动块始终展开。 */
	expandUnchanged?: boolean
	/** 额外 CSS，注入 Shadow DOM 的 unsafe 层(优先级最高)。 */
	unsafeCSS?: string
}

export type DiffViewProps = {
	source: DiffSource
	options?: DiffViewOptions
	/** 文件头左侧图标。优先传文件类型图标；传了就替掉库自带的改动类型图标。 */
	headerIcon?: ReactNode
	className?: string
	style?: CSSProperties
}

/** 主题名固定用 github 两套，跟 MarkdownView 里的代码块一致。 */
const DIFF_THEMES = { light: 'github-light', dark: 'github-dark' } as const

/**
 * 项目默认。库本身默认是分栏（split），这里改成堆叠；其余与库一致，写死成契约以免漂移。
 */
const DEFAULT_OPTIONS: DiffViewOptions = {
	diffStyle: 'unified',
	diffIndicators: 'bars',
	lineDiffType: 'word-alt',
	hunkSeparators: 'line-info',
	overflow: 'scroll',
}

/**
 * 增删行数。
 *
 * 库自带的统计用连字符减号 `-`，字形落在 x 高度中段，比加号低一截，`-2 +3` 看着不在一条线上。
 * 自己画：减号用真正的 U+2212，跟加号一样落在数学轴上。
 */
function diffCounts(hunks: Hunk[]): ReactNode {
	const additions = hunks.reduce((sum, hunk) => sum + hunk.additionLines, 0)
	const deletions = hunks.reduce((sum, hunk) => sum + hunk.deletionLines, 0)
	return (
		<span className="flex items-center gap-1 font-mono text-md">
			{deletions > 0 || additions === 0 ? <span className="text-error">−{deletions}</span> : null}
			{additions > 0 || deletions === 0 ? <span className="text-success">+{additions}</span> : null}
		</span>
	)
}

/**
 * 渲染 diff / 代码对比。
 *
 * 三种来源：`patch`（unified 文本）、`versions`（两个版本）、`file`（单文件，不标 +/-）。
 * 底层的 `@pierre/diffs` 只在这里出现，业务侧别直接 import。
 */
export function DiffView({ source, options, headerIcon, className, style }: DiffViewProps) {
	const themeType = useThemeType()
	const merged = useMemo(
		() => ({
			...DEFAULT_OPTIONS,
			...options,
			theme: DIFF_THEMES,
			themeType,
			unsafeCSS: [headerCss, options?.unsafeCSS].filter(Boolean).join('\n'),
		}),
		[options, themeType],
	)
	const hostStyle = useMemo(() => ({ ...diffThemeVars, ...style }) as CSSProperties, [style])
	const hostClass = classNames({ 'diff-view-has-icon': headerIcon != null }, className)
	const renderHeaderPrefix = headerIcon != null ? () => headerIcon : undefined

	const oldSide = source.kind === 'versions' ? source.old : null
	const newSide = source.kind === 'versions' ? source.new : null
	const fileDiff = useMemo(
		() => (oldSide || newSide ? parseDiffFromFile(oldSide, newSide) : null),
		[oldSide, newSide],
	)

	if (source.kind === 'patch') {
		return (
			<PatchDiff
				patch={source.patch}
				options={merged}
				renderHeaderPrefix={renderHeaderPrefix}
				renderHeaderMetadata={(fileDiff) => diffCounts(fileDiff.hunks)}
				className={hostClass}
				style={hostStyle}
			/>
		)
	}
	if (source.kind === 'file') {
		const file = { name: source.name, contents: source.contents }
		return (
			<File
				file={file}
				options={merged}
				renderHeaderPrefix={renderHeaderPrefix}
				className={hostClass}
				style={hostStyle}
			/>
		)
	}
	if (!fileDiff) return null
	return (
		<FileDiff
			fileDiff={fileDiff}
			options={merged}
			renderHeaderPrefix={renderHeaderPrefix}
			renderHeaderMetadata={(diff) => diffCounts(diff.hunks)}
			className={hostClass}
			style={hostStyle}
		/>
	)
}
