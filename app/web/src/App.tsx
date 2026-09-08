import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Conversation } from './components/Conversation'
import { Extension } from './components/Extension'
import { Setting } from './components/Setting'

export function App() {
	const [settingOpen, setSettingOpen] = useState(false)
	return (
		<div className="flex h-screen w-screen bg-app text-fg">
			<Sidebar onOpenSetting={() => setSettingOpen(true)} />
			<Conversation className="flex-1" />
			<Extension className="w-[570px] border-l border-border" />
			{settingOpen && <Setting onClose={() => setSettingOpen(false)} />}
		</div>
	)
}