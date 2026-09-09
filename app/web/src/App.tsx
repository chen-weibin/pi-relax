import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Conversation } from './components/Conversation'
import { Extension } from './components/Extension'
import { Setting } from './components/Setting'
import { ResizablePanelGroup } from './ui/ResizablePanelGroup'
import { ResizablePanel } from './ui/ResizablePanel'
import { ResizableHandle } from './ui/ResizableHandle'
import {
	readCollapsedState,
	usePersistedPanelLayout,
	writeCollapsedState,
} from './hooks/usePersistedPanelLayout'

const OUTER_ID = 'app-shell'
const INNER_ID = 'main-area'
const OUTER_PANELS = ['sidebar', 'main']
const INNER_PANELS = ['conversation', 'extension']

export function App() {
	const [settingOpen, setSettingOpen] = useState(false)
	const [{ sidebar: sidebarOpen, extension: extensionOpen }, setCollapsed] = useState(
		() => readCollapsedState(OUTER_ID),
	)

	useEffect(() => {
		writeCollapsedState(OUTER_ID, { sidebar: sidebarOpen, extension: extensionOpen })
	}, [sidebarOpen, extensionOpen])

	const outerLayout = usePersistedPanelLayout({
		groupId: OUTER_ID,
		panelIds: OUTER_PANELS,
	})
	const innerLayout = usePersistedPanelLayout({
		groupId: INNER_ID,
		panelIds: INNER_PANELS,
	})

	const toggleSidebar = () => setCollapsed((c) => ({ ...c, sidebar: !c.sidebar }))
	const toggleExtension = () => setCollapsed((c) => ({ ...c, extension: !c.extension }))

	return (
		<div className="flex h-screen w-screen bg-app text-fg">
			<ResizablePanelGroup
				className="h-full w-full"
				defaultLayout={outerLayout.defaultLayout}
				onLayoutChanged={outerLayout.onLayoutChanged}
			>
				{sidebarOpen && (
					<>
						<ResizablePanel id="sidebar" defaultSize={260} minSize={200} maxSize={400}>
							<Sidebar onOpenSetting={() => setSettingOpen(true)} />
						</ResizablePanel>
						<ResizableHandle />
					</>
				)}

				<ResizablePanel id="main" minSize={630}>
					<ResizablePanelGroup
						className="h-full w-full"
						defaultLayout={innerLayout.defaultLayout}
						onLayoutChanged={innerLayout.onLayoutChanged}
					>
						<ResizablePanel id="conversation" minSize={320}>
							<Conversation
								onToggleSidebar={toggleSidebar}
								onToggleExtension={toggleExtension}
								sidebarOpen={sidebarOpen}
								extensionOpen={extensionOpen}
							/>
						</ResizablePanel>

						{extensionOpen && (
							<>
								<ResizableHandle />
								<ResizablePanel id="extension" groupResizeBehavior="preserve-pixel-size" defaultSize={540} minSize={300}>
									<Extension />
								</ResizablePanel>
							</>
						)}
					</ResizablePanelGroup>
				</ResizablePanel>
			</ResizablePanelGroup>

			{settingOpen && <Setting onClose={() => setSettingOpen(false)} />}
		</div>
	)
}
