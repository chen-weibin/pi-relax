import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { MainContainer } from './components/MainContainer'
import { Extension } from './components/Extension'
import { Setting } from './components/Setting'
import { ResizablePanelGroup } from './ui/ResizablePanelGroup'
import { ResizablePanel } from './ui/ResizablePanel'
import { ResizableHandle } from './ui/ResizableHandle'
import { usePersistedPanelLayout } from './hooks/usePersistedPanelLayout'

export type MainView = 'conversation' | 'customize'

const OUTER_ID = 'app-shell'
const INNER_ID = 'main-area'
const OUTER_PANELS = ['sidebar', 'main']
const INNER_PANELS = ['content', 'extension']

export function App() {
	const [settingOpen, setSettingOpen] = useState(false)
	const [sidebarOpen, setSidebarOpen] = useState(true)
	const [extensionOpen, setExtensionOpen] = useState(false)
	const [mainView, setMainView] = useState<MainView>('conversation')

	const outerLayout = usePersistedPanelLayout({
		groupId: OUTER_ID,
		panelIds: OUTER_PANELS,
	})
	const innerLayout = usePersistedPanelLayout({
		groupId: INNER_ID,
		panelIds: INNER_PANELS,
	})

	const toggleSidebar = () => setSidebarOpen((v) => !v)
	const toggleExtension = () => setExtensionOpen((v) => !v)

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
							<Sidebar
								view={mainView}
								onSelectView={setMainView}
								onOpenSetting={() => setSettingOpen(true)}
							/>
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
						<ResizablePanel id="content" minSize={320}>
							<MainContainer
								view={mainView}
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
