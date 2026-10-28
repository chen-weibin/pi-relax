import type { ComponentType } from 'react'
import { buttonDoc } from './Button'
import { disclosureRowDoc } from './DisclosureRow'
import { dotMatrixDoc } from './DotMatrix'
import { editorDoc } from './Editor'
import { expandableDoc } from './Expandable'
import { headingDoc } from './Heading'
import { hintDoc } from './Hint'
import { iconButtonDoc } from './IconButton'
import { inputDoc } from './Input'
import { loadingDotsDoc } from './LoadingDots'
import { markdownViewDoc } from './MarkdownView'
import { messageSurfaceDoc } from './MessageSurface'
import { modalDoc } from './Modal'
import { monacoEditorDoc } from './MonacoEditor'
import { numberStepperDoc } from './NumberStepper'
import { paneHeaderDoc } from './PaneHeader'
import { paragraphDoc } from './Paragraph'
import { popoverDoc } from './Popover'
import { progressBarDoc } from './ProgressBar'
import { resizableDoc } from './Resizable'
import { searchInputDoc } from './SearchInput'
import { selectDoc } from './Select'
import { settingDoc } from './Setting'
import { shinyTextDoc } from './ShinyText'
import { statusDotDoc } from './StatusDot'
import { switchDoc } from './Switch'
import { tooltipDoc } from './Tooltip'
import { typewriterTextDoc } from './TypewriterText'

export type UiDocSection = {
	id: string
	heading: string
	description: string
	nav: string[]
	Demo: ComponentType
}

export const uiDocGroups: { title: string; sections: UiDocSection[] }[] = [
	{
		title: '操作',
		sections: [buttonDoc, iconButtonDoc, switchDoc, inputDoc, searchInputDoc, selectDoc, numberStepperDoc, progressBarDoc],
	},
	{
		title: '浮层',
		sections: [tooltipDoc, popoverDoc, modalDoc],
	},
	{
		title: '反馈',
		sections: [statusDotDoc, loadingDotsDoc, dotMatrixDoc, shinyTextDoc],
	},
	{
		title: '布局',
		sections: [messageSurfaceDoc, paneHeaderDoc, settingDoc, expandableDoc, disclosureRowDoc, resizableDoc],
	},
	{
		title: '文本',
		sections: [headingDoc, paragraphDoc, hintDoc, editorDoc, typewriterTextDoc, markdownViewDoc, monacoEditorDoc],
	},
]

export const uiDocSections = uiDocGroups.flatMap((group) => group.sections)
