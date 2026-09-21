import type { ReactNode } from 'react'
import { ShellPanelToggles } from '../../components/ShellPanelToggles'

export function ExtensionShellHeader({ children }: { children?: ReactNode }) {
	return (
		<div className="flex h-9 shrink-0 items-center border-b border-border pl-1 pr-3">
			<div className="flex min-w-0 flex-1 items-center overflow-hidden">{children}</div>
			<ShellPanelToggles />
		</div>
	)
}
