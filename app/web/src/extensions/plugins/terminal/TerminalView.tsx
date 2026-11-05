import { useState } from 'react'
import classNames from 'classnames'
import { ListIcon } from '../../../icons'
import { useCatalogStore } from '../../../store/catalog'
import { IconButton } from '../../../ui/IconButton'
import { PaneHeader } from '../../../ui/PaneHeader'
import { currentExtensionCwd } from '../../sessionTabs'
import type { PluginRenderProps } from '../../types'
import { SESSION_NAV_WIDTH, SessionSwitcher } from './SessionSwitcher'
import { XtermSession } from './XtermSession'
import { isTerminalPayload } from './open'

export function TerminalView({ tab }: PluginRenderProps) {
	const [navOpen, setNavOpen] = useState(true)
	useCatalogStore((s) => s.defaultCwd)
	const cwd = currentExtensionCwd()
	const rootName = cwd ? (cwd.split('/').filter(Boolean).pop() ?? cwd) : ''
	const payload = isTerminalPayload(tab.payload) ? tab.payload : null

	return (
		<div className="flex h-full min-h-0 flex-col bg-app">
			<PaneHeader
				left={
					cwd ? (
						<span className="min-w-0 truncate px-1 text-sm text-fg-2" title={cwd}>
							{rootName}
						</span>
					) : undefined
				}
				right={
					<IconButton
						title={navOpen ? '收起终端列表' : '展开终端列表'}
						aria-pressed={navOpen}
						className="[&_svg]:h-4 [&_svg]:w-4"
						onClick={() => setNavOpen((open) => !open)}
					>
						<ListIcon />
					</IconButton>
				}
			/>
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<div className="min-h-0 min-w-0 flex-1">
					{payload ? (
						<XtermSession key={payload.sessionId} sessionId={payload.sessionId} />
					) : (
						<div className="p-3 text-sm text-fg-3">无效的终端会话</div>
					)}
				</div>
				<div
					aria-hidden={!navOpen}
					className={classNames(
						'shrink-0 overflow-hidden bg-panel transition-[width] duration-200 ease-out motion-reduce:transition-none',
						navOpen ? 'border-l border-border' : 'pointer-events-none',
					)}
					style={{ width: navOpen ? SESSION_NAV_WIDTH : 0 }}
				>
					<SessionSwitcher tab={tab} />
				</div>
			</div>
		</div>
	)
}
