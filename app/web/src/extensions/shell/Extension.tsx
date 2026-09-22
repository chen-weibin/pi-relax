import classNames from 'classnames'
import { useShallow } from 'zustand/react/shallow'
import '../../styles/scrollbar.css'
import { getExtensionPlugin } from '../registry'
import { useExtensionStore } from '../store'
import { ExtensionShellHeader } from './ExtensionShellHeader'
import { ExtensionTabBar } from './ExtensionTabBar'
import { ExtensionWelcome } from './ExtensionWelcome'

interface Props {
	className?: string
	collapsed?: boolean
}

export function Extension({ className, collapsed = false }: Props) {
	const { tabs, activeTabId } = useExtensionStore(
		useShallow((s) => ({
			tabs: s.tabs,
			activeTabId: s.activeTabId,
		})),
	)

	if (collapsed) return null

	const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
	const plugin = activeTab ? getExtensionPlugin(activeTab.pluginId) : undefined
	const Main = plugin?.render
	const Side = plugin?.renderSide
	const showWelcome = tabs.length === 0 || !activeTab || !Main

	return (
		<aside className={classNames('flex h-full w-full min-w-0 flex-col bg-app text-fg', className)}>
			{showWelcome ? (
				<>
					<ExtensionShellHeader />
					<div className="min-h-0 flex-1">
						<ExtensionWelcome />
					</div>
				</>
			) : (
				<>
					<ExtensionTabBar />
					<div className="flex min-h-0 flex-1">
						<div className="min-h-0 min-w-0 flex-1">
							<Main tab={activeTab} />
						</div>
						{Side && <Side tab={activeTab} />}
					</div>
				</>
			)}
		</aside>
	)
}
