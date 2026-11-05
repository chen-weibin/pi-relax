import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useShallow } from 'zustand/react/shallow'
import classNames from 'classnames'
import { CloseIcon } from '../../icons'
import { StatusDot } from '../../ui/StatusDot'
import { getDraftVersion, isPathDirty, subscribeDrafts } from '../plugins/files/drafts'
import { isFilesPayload } from '../plugins/files/open'
import { getExtensionPlugin } from '../registry'
import { useExtensionStore } from '../store'
import type { ExtensionTab } from '../types'
import { AddPluginMenu } from './AddPluginMenu'
import { ExtensionShellHeader } from './ExtensionShellHeader'

const ADD_BUTTON_WIDTH = 26
const TAB_FADE_WIDTH = 10
const UNPINNED_ADD_GAP = 2
/** 右侧 + 与渐隐会挡住 tab，滚入可视区时要避开。 */
const TAB_SCROLL_RIGHT_INSET = ADD_BUTTON_WIDTH + TAB_FADE_WIDTH

function scrollBehavior(): ScrollBehavior {
	if (typeof window === 'undefined') return 'auto'
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** 把 tab 完整滚进 scroller 的可见范围（不被 overflow / 右侧遮罩切掉）。 */
function scrollTabFullyIntoView(scroller: HTMLElement, tabEl: HTMLElement) {
	const sRect = scroller.getBoundingClientRect()
	const tRect = tabEl.getBoundingClientRect()
	const visibleLeft = sRect.left
	const visibleRight = sRect.right - TAB_SCROLL_RIGHT_INSET
	const visibleWidth = visibleRight - visibleLeft
	if (visibleWidth <= 0) return

	let delta = 0
	if (tRect.width >= visibleWidth) {
		delta = tRect.left - visibleLeft
	} else if (tRect.left < visibleLeft) {
		delta = tRect.left - visibleLeft
	} else if (tRect.right > visibleRight) {
		delta = tRect.right - visibleRight
	}
	if (delta === 0) return
	scroller.scrollBy({ left: delta, behavior: scrollBehavior() })
}

function ExtensionTabItem({
	tab,
	active,
	onActivate,
	onClose,
}: {
	tab: ExtensionTab
	active: boolean
	onActivate: () => void
	onClose: () => void
}) {
	useSyncExternalStore(subscribeDrafts, getDraftVersion)
	const plugin = getExtensionPlugin(tab.pluginId)
	const Icon = tab.icon ?? plugin?.icon
	const filePath =
		tab.pluginId === 'files' && isFilesPayload(tab.payload) && tab.payload.kind === 'file'
			? tab.payload.path
			: null
	const saving = filePath ? isPathDirty(filePath) : false
	const title = tab.title.replace(/ •$/, '')

	return (
		<div
			data-tab-id={tab.id}
			className={classNames(
				'group/tab relative h-[26px] w-max min-w-[54px] max-w-[160px] shrink-0 overflow-hidden rounded-md',
				active
					? 'bg-surface-hover text-fg-bright'
					: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
			)}
		>
			<button
				type="button"
				onClick={onActivate}
				className="flex h-full max-w-full cursor-pointer items-center gap-1.5 py-0 pl-2 pr-2 text-left text-sm"
			>
				{Icon && (
					<span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5">
						<Icon />
					</span>
				)}
				<span className="min-w-0 truncate">{title}</span>
				{saving && <StatusDot kind="normal" label="保存中" />}
			</button>
			<span
				aria-hidden
				className={classNames(
					'pointer-events-none absolute inset-y-0 right-0 w-9 opacity-0 transition-opacity duration-100 group-hover/tab:opacity-100',
					'bg-[linear-gradient(to_right,transparent_0%,var(--surface-hover)_38%,var(--surface-hover)_100%)]',
				)}
			/>
			<button
				type="button"
				title={`关闭 ${title}`}
				aria-label={`关闭 ${title}`}
				className={classNames(
					'absolute right-0 top-0 z-10 flex size-[26px] cursor-pointer items-center justify-center',
					'text-fg-2 opacity-0 transition-opacity duration-100 hover:text-fg-bright',
					'pointer-events-none group-hover/tab:pointer-events-auto group-hover/tab:opacity-100',
					'[&_svg]:h-3.5 [&_svg]:w-3.5',
				)}
				onClick={(e) => {
					e.stopPropagation()
					onClose()
				}}
			>
				<CloseIcon />
			</button>
		</div>
	)
}

export function ExtensionTabBar() {
	const { tabs, activeTabId, activateTab, closeTab } = useExtensionStore(
		useShallow((s) => ({
			tabs: s.tabs,
			activeTabId: s.activeTabId,
			activateTab: s.activateTab,
			closeTab: s.closeTab,
		})),
	)

	const containerRef = useRef<HTMLDivElement>(null)
	const tabsRef = useRef<HTMLDivElement>(null)
	const scrollerRef = useRef<HTMLDivElement>(null)
	const [addPinned, setAddPinned] = useState(false)

	const scrollActiveTabIntoView = useCallback(() => {
		const scroller = scrollerRef.current
		if (!scroller || !activeTabId) return
		const tabEl = scroller.querySelector<HTMLElement>(
			`[data-tab-id="${CSS.escape(activeTabId)}"]`,
		)
		if (!tabEl) return
		scrollTabFullyIntoView(scroller, tabEl)
	}, [activeTabId])

	const measure = useCallback(() => {
		const container = containerRef.current
		const tabsEl = tabsRef.current
		if (!container || !tabsEl) return
		const spacer = tabsEl.querySelector<HTMLElement>('[data-tab-spacer]')
		const spacerWidth = spacer?.offsetWidth ?? 0
		const tabsOnlyWidth = tabsEl.scrollWidth - spacerWidth
		const trailingWidth =
			ADD_BUTTON_WIDTH + (spacerWidth > 0 ? 0 : UNPINNED_ADD_GAP)
		setAddPinned(tabsOnlyWidth + trailingWidth > container.clientWidth)
	}, [])

	useLayoutEffect(() => {
		measure()
		const ro = new ResizeObserver(measure)
		if (containerRef.current) ro.observe(containerRef.current)
		if (tabsRef.current) ro.observe(tabsRef.current)
		return () => ro.disconnect()
	}, [measure, tabs])

	useLayoutEffect(() => {
		if (!addPinned) return
		scrollActiveTabIntoView()
	}, [addPinned, activeTabId, tabs, scrollActiveTabIntoView])

	useEffect(() => {
		const scroller = scrollerRef.current
		if (!scroller || !addPinned) return
		const onWheel = (e: WheelEvent) => {
			if (e.ctrlKey || e.metaKey) return
			if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
			e.preventDefault()
			scroller.scrollLeft += e.deltaY
		}
		scroller.addEventListener('wheel', onWheel, { passive: false })
		return () => scroller.removeEventListener('wheel', onWheel)
	}, [addPinned])

	const tabItems = tabs.map((tab) => (
		<ExtensionTabItem
			key={tab.id}
			tab={tab}
			active={tab.id === activeTabId}
			onActivate={() => {
				activateTab(tab.id)
				scrollActiveTabIntoView()
			}}
			onClose={() => closeTab(tab.id)}
		/>
	))

	return (
		<ExtensionShellHeader>
			<div ref={containerRef} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
				{addPinned ? (
					<div className="relative isolate min-w-0 flex-1">
						<div
							ref={scrollerRef}
							className="scrollbar-none relative z-0 flex h-[26px] items-center overflow-x-auto"
						>
							<div ref={tabsRef} className="flex items-center gap-0.5">
								{tabItems}
								<span
									aria-hidden
									data-tab-spacer
									className="shrink-0"
									style={{ width: ADD_BUTTON_WIDTH }}
								/>
							</div>
						</div>
						<span
							aria-hidden
							className="pointer-events-none absolute inset-y-0 z-20 bg-[linear-gradient(to_right,transparent_0%,var(--app)_68%,var(--app)_100%)]"
							style={{ right: ADD_BUTTON_WIDTH, width: TAB_FADE_WIDTH }}
						/>
						<span
							aria-hidden
							className="pointer-events-none absolute inset-y-0 right-0 z-20 bg-app"
							style={{ width: ADD_BUTTON_WIDTH }}
						/>
						<AddPluginMenu className="absolute right-0 top-0 z-30 shrink-0" />
					</div>
				) : (
					<div className="flex h-[26px] items-center gap-0.5">
						<div ref={tabsRef} className="flex items-center gap-0.5">
							{tabItems}
						</div>
						<AddPluginMenu className="shrink-0" />
					</div>
				)}
			</div>
		</ExtensionShellHeader>
	)
}
