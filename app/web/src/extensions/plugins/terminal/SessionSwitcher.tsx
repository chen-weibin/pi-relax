import { useShallow } from 'zustand/react/shallow'
import classNames from 'classnames'
import { PlusIcon, TerminalIcon } from '../../../icons'
import { IconButton } from '../../../ui/IconButton'
import { useExtensionStore } from '../../store'
import type { PluginRenderProps } from '../../types'

export function SessionSwitcher({ tab }: PluginRenderProps) {
	const { tabs, activateTab, openPlugin } = useExtensionStore(
		useShallow((s) => ({
			tabs: s.tabs,
			activateTab: s.activateTab,
			openPlugin: s.openPlugin,
		})),
	)
	const sessions = tabs.filter((item) => item.pluginId === 'terminal')

	return (
		<div className="flex h-full w-[220px] shrink-0 flex-col border-l border-border px-2 py-2">
			<div className="mb-1 flex h-[30px] items-center justify-between px-1">
				<span className="text-xs text-fg-3">
					{sessions.length} Terminal{sessions.length === 1 ? '' : 's'}
				</span>
				<IconButton
					size="sm"
					title="新建终端"
					className="[&_svg]:h-3 [&_svg]:w-3"
					onClick={() => openPlugin('terminal')}
				>
					<PlusIcon />
				</IconButton>
			</div>
			<div className="flex flex-col gap-0.5">
				{sessions.map((session) => {
					const active = session.id === tab.id
					return (
						<button
							key={session.id}
							type="button"
							onClick={() => activateTab(session.id)}
							className={classNames(
								'flex h-[30px] w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm transition-colors duration-100',
								active
									? 'bg-surface-active text-fg-bright'
									: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
							)}
						>
							<span className="shrink-0 text-fg-3">
								<TerminalIcon />
							</span>
							<span className="min-w-0 truncate">{session.title}</span>
						</button>
					)
				})}
			</div>
		</div>
	)
}
