import { useShallow } from 'zustand/react/shallow'
import classNames from 'classnames'
import { CloseIcon, PlusIcon, TerminalIcon } from '../../../icons'
import { IconButton } from '../../../ui/IconButton'
import { useExtensionStore } from '../../store'
import type { PluginRenderProps } from '../../types'

export const SESSION_NAV_WIDTH = 220

export function SessionSwitcher({ tab }: PluginRenderProps) {
	const { tabs, activateTab, closeTab, openPlugin } = useExtensionStore(
		useShallow((s) => ({
			tabs: s.tabs,
			activateTab: s.activateTab,
			closeTab: s.closeTab,
			openPlugin: s.openPlugin,
		})),
	)
	const sessions = tabs.filter((item) => item.pluginId === 'terminal')

	return (
		<div
			className="flex h-full shrink-0 flex-col py-2 pl-2 pr-3"
			style={{ width: SESSION_NAV_WIDTH }}
		>
			<div className="group/navhead mb-1 flex h-[30px] items-center justify-between">
				<span className="text-xs text-fg-3">{sessions.length} 个终端</span>
				<IconButton
					title="新建终端"
					className="pointer-events-none opacity-0 transition-opacity duration-100 group-hover/navhead:pointer-events-auto group-hover/navhead:opacity-100 group-focus-within/navhead:pointer-events-auto group-focus-within/navhead:opacity-100 [&_svg]:h-3 [&_svg]:w-3"
					onClick={() => openPlugin('terminal')}
				>
					<PlusIcon />
				</IconButton>
			</div>
			<div className="flex flex-col gap-0.5">
				{sessions.map((session) => {
					const active = session.id === tab.id
					return (
						<div
							key={session.id}
							className={classNames(
								'group/row flex h-[30px] items-center rounded-md px-1',
								active
									? 'bg-surface-active text-fg-bright'
									: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
							)}
						>
							<button
								type="button"
								onClick={() => activateTab(session.id)}
								className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-sm"
							>
								<span className="shrink-0 text-fg-3">
									<TerminalIcon />
								</span>
								<span className="min-w-0 truncate">{session.title}</span>
							</button>
							<IconButton
								title="关闭终端"
								className="pointer-events-none shrink-0 opacity-0 transition-opacity duration-100 group-hover/row:pointer-events-auto group-hover/row:opacity-100 group-focus-within/row:pointer-events-auto group-focus-within/row:opacity-100"
								onClick={(e) => {
									e.stopPropagation()
									closeTab(session.id)
								}}
							>
								<CloseIcon />
							</IconButton>
						</div>
					)
				})}
			</div>
		</div>
	)
}
