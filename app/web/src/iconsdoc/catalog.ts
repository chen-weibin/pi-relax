import type { ComponentType } from 'react'
import * as AllIcons from '../icons'
import * as FileIcons from '../icons/fileTypes'

export type IconEntry = {
	name: string
	Icon: ComponentType<Record<string, unknown>>
	/** 展台渲染时传给图标的 props（如实心圆标 filled: false） */
	props?: Record<string, unknown>
}

export type IconsGroupId = 'color' | 'files'

export type IconsSection = {
	title: string
	entries: IconEntry[]
}

export type IconsGroup = {
	id: IconsGroupId
	title: string
	description: string
	sections: IconsSection[]
}

function isIconExport(name: string, value: unknown): value is ComponentType {
	return name.endsWith('Icon') && typeof value === 'function'
}

function entriesFrom(mod: Record<string, unknown>): IconEntry[] {
	return Object.entries(mod)
		.filter(([name, value]) => isIconExport(name, value))
		.map(([name, Icon]) => ({ name, Icon: Icon as ComponentType<Record<string, unknown>> }))
		.sort((a, b) => a.name.localeCompare(b.name))
}

/** 实心圆标：名称以 CircleIcon 结尾（状态 / 关闭圆） */
function isSolidIcon(name: string) {
	return name.endsWith('CircleIcon')
}

/** 支持 filled 的状态圆标（CloseCircle 本身已镂空，不传） */
const FILLABLE_SOLID = new Set([
	'SuccessCircleIcon',
	'ErrorCircleIcon',
	'WarningCircleIcon',
	'InfoCircleIcon',
])

const fileEntries = entriesFrom(FileIcons as Record<string, unknown>)
const fileNames = new Set(fileEntries.map((e) => e.name))

const colorEntries = entriesFrom(AllIcons as Record<string, unknown>).filter(
	(e) => !fileNames.has(e.name),
)

const outlineEntries = colorEntries.filter((e) => !isSolidIcon(e.name))
const solidEntries = colorEntries
	.filter((e) => isSolidIcon(e.name))
	.map((e) => (FILLABLE_SOLID.has(e.name) ? { ...e, props: { filled: false } } : e))

export const iconsGroups: IconsGroup[] = [
	{
		id: 'color',
		title: '可着色',
		description: '单色图标，跟随 currentColor。点格子复制组件名；顶部可切换预览色。',
		sections: [
			{ title: '线框', entries: outlineEntries },
			{ title: '实心', entries: solidEntries },
		],
	},
	{
		id: 'files',
		title: '文件',
		description: '文件类型彩色图标（固定品牌色）。点格子复制组件名。',
		sections: [{ title: '', entries: fileEntries }],
	},
]

export function getIconsGroup(id: string | undefined): IconsGroup | undefined {
	return iconsGroups.find((g) => g.id === id)
}
