import { Sidebar } from './components/Sidebar'
import { MainContainer } from './components/MainContainer'
import { Extension } from './components/Extension'
import { Setting } from './components/Setting'
import { ResizablePanelGroup } from './ui/ResizablePanelGroup'
import { ResizablePanel } from './ui/ResizablePanel'
import { ResizableHandle } from './ui/ResizableHandle'
import { usePersistedPanelLayout } from './hooks/usePersistedPanelLayout'
import { useShallow } from 'zustand/react/shallow'
import { useCommonStore } from './store'
import type { MainView } from './store'

export type { MainView }

const OUTER_ID = 'app-shell'
const INNER_ID = 'main-area'
const OUTER_PANELS = ['sidebar', 'main']
const INNER_PANELS = ['content', 'extension']

export function App() {
	const { sidebarOpen, extensionOpen, settingOpen } = useCommonStore(
		useShallow((s) => ({
			sidebarOpen: s.sidebarOpen,
			extensionOpen: s.extensionOpen,
			settingOpen: s.settingOpen,
		})),
	)

	const outerLayout = usePersistedPanelLayout({
		groupId: OUTER_ID,
		panelIds: OUTER_PANELS,
	})
	const innerLayout = usePersistedPanelLayout({
		groupId: INNER_ID,
		panelIds: INNER_PANELS,
	})

	return (
		<div className="flex h-screen w-screen bg-app text-fg">
			<ResizablePanelGroup
				className="h-full w-full"
				defaultLayout={outerLayout.defaultLayout}
				onLayoutChanged={outerLayout.onLayoutChanged}
			>
				{sidebarOpen && (
					<>
						<ResizablePanel id="sidebar" defaultSize={250} minSize={200} maxSize={400}>
							<Sidebar />
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
							<MainContainer />
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

			{settingOpen && <Setting />}
		</div>
	)
}
