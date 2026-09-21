import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type MainView = 'conversation' | 'customize'

interface CommonState {
	settingOpen: boolean
	sidebarOpen: boolean
	extensionOpen: boolean
	mainView: MainView
	setSettingOpen: (open: boolean) => void
	toggleSetting: () => void
	setSidebarOpen: (open: boolean) => void
	toggleSidebar: () => void
	setExtensionOpen: (open: boolean) => void
	toggleExtension: () => void
	setMainView: (view: MainView) => void
}

export const useCommonStore = create<CommonState>()(
	immer((set) => ({
		settingOpen: false,
		sidebarOpen: true,
		extensionOpen: true,
		mainView: 'conversation',
		setSettingOpen: (open) =>
			set((s) => {
				s.settingOpen = open
			}),
		toggleSetting: () =>
			set((s) => {
				s.settingOpen = !s.settingOpen
			}),
		setSidebarOpen: (open) =>
			set((s) => {
				s.sidebarOpen = open
			}),
		toggleSidebar: () =>
			set((s) => {
				s.sidebarOpen = !s.sidebarOpen
			}),
		setExtensionOpen: (open) =>
			set((s) => {
				s.extensionOpen = open
			}),
		toggleExtension: () =>
			set((s) => {
				s.extensionOpen = !s.extensionOpen
			}),
		setMainView: (view) =>
			set((s) => {
				s.mainView = view
			}),
	})),
)
