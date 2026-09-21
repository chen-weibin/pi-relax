import { useCommonStore } from '../store'
import { ShellPanelToggles } from './ShellPanelToggles'

export function MainHeader() {
	const extensionOpen = useCommonStore((s) => s.extensionOpen)

	return (
		<div className="flex h-9 shrink-0 items-center justify-between px-3">
			<div />
			{!extensionOpen && <ShellPanelToggles />}
		</div>
	)
}
