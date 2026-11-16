import type { ComponentType } from 'react'
import { appIconDoc } from './AppIcon'
import { buttonDoc } from './Button'
import { disclosureRowDoc } from './DisclosureRow'
import { contextMenuDoc } from './ContextMenu'
import { dashRailDoc } from './DashRail'
import { dropdownDoc } from './Dropdown'
import { dotMatrixDoc } from './DotMatrix'
import { editorDoc } from './Editor'
import { emptyStateDoc } from './EmptyState'
import { expandableDoc } from './Expandable'
import { flipTextDoc } from './FlipText'
import { glassIconsDoc } from './GlassIcons'
import { headingDoc } from './Heading'
import { hintDoc } from './Hint'
import { iconButtonDoc } from './IconButton'
import { inputDoc } from './Input'
import { loadingDotsDoc } from './LoadingDots'
import { markdownViewDoc } from './MarkdownView'
import { messageDoc } from './Message'
import { messageSurfaceDoc } from './MessageSurface'
import { dialogDoc } from './Dialog'
import { diffViewDoc } from './DiffView'
import { modalDoc } from './Modal'
import { monacoEditorDoc } from './MonacoEditor'
import { numberStepperDoc } from './NumberStepper'
import { paneHeaderDoc } from './PaneHeader'
import { paragraphDoc } from './Paragraph'
import { popoverDoc } from './Popover'
import { progressBarDoc } from './ProgressBar'
import { resizableDoc } from './Resizable'
import { searchInputDoc } from './SearchInput'
import { segmentedDoc } from './Segmented'
import { selectDoc } from './Select'
import { settingDoc } from './Setting'
import { shinyTextDoc } from './ShinyText'
import { siteIconRowDoc } from './SiteIconRow'
import { siteMarkDoc } from './SiteMark'
import { sourceChipDoc } from './SourceChip'
import { spinnerDoc } from './Spinner'
import { statusDotDoc } from './StatusDot'
import { swipeToastDoc } from './SwipeToast'
import { switchDoc } from './Switch'
import { themeSelectorDoc } from './ThemeSelector'
import { tooltipDoc } from './Tooltip'
import { pathLinkDoc } from './PathLink'
import { titleRowDoc } from './TitleRow'
import { trailTextDoc } from './TrailText'
import { typewriterTextDoc } from './TypewriterText'

export type UiDocSection = {
	id: string
	heading: string
	description: string
	nav: string[]
	Demo: ComponentType
}

export type UiDocGroup = {
	id: string
	title: string
	sections: UiDocSection[]
}

export const uiDocGroups: UiDocGroup[] = [
	{
		id: 'actions',
		title: '操作',
		sections: [
			buttonDoc,
			iconButtonDoc,
			switchDoc,
			segmentedDoc,
			themeSelectorDoc,
			inputDoc,
			searchInputDoc,
			selectDoc,
			numberStepperDoc,
			progressBarDoc,
		],
	},
	{
		id: 'overlays',
		title: '浮层',
		sections: [tooltipDoc, popoverDoc, dropdownDoc, contextMenuDoc, modalDoc, dialogDoc],
	},
	{
		id: 'feedback',
		title: '反馈',
		sections: [
			statusDotDoc,
			spinnerDoc,
			loadingDotsDoc,
			dotMatrixDoc,
			emptyStateDoc,
			shinyTextDoc,
			flipTextDoc,
			titleRowDoc,
			trailTextDoc,
			pathLinkDoc,
			siteMarkDoc,
			siteIconRowDoc,
			sourceChipDoc,
			appIconDoc,
			glassIconsDoc,
			messageDoc,
			swipeToastDoc,
		],
	},
	{
		id: 'layout',
		title: '布局',
		sections: [messageSurfaceDoc, paneHeaderDoc, settingDoc, expandableDoc, disclosureRowDoc, resizableDoc, dashRailDoc],
	},
	{
		id: 'text',
		title: '文本',
		sections: [headingDoc, paragraphDoc, hintDoc, editorDoc, typewriterTextDoc, markdownViewDoc, monacoEditorDoc, diffViewDoc],
	},
]

export function getUiDocGroup(id: string | undefined): UiDocGroup | undefined {
	return uiDocGroups.find((group) => group.id === id)
}
