import { useShallow } from 'zustand/react/shallow'
import { FileIcon } from '../../icons'
import { useExtensionStore } from '../store'
import { extensionPlugins } from '../registry'

const welcomeLabels: Record<string, string> = {
	files: '文件',
	terminal: '终端',
}

export function ExtensionWelcome() {
	const openPlugin = useExtensionStore(useShallow((s) => s.openPlugin))

	return (
		<div className="flex h-full w-full items-center justify-center px-6">
			<div className="flex w-full max-w-52 flex-col gap-0.5">
				{extensionPlugins.map((plugin) => {
					const Icon = plugin.icon ?? FileIcon
					return (
						<button
							key={plugin.id}
							type="button"
							onClick={() => openPlugin(plugin.id)}
							className="flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-fg-2 transition-colors duration-100 hover:bg-surface-hover hover:text-fg-bright"
						>
							<span className="text-fg-3">
								<Icon />
							</span>
							<span>{welcomeLabels[plugin.id] ?? plugin.title}</span>
						</button>
					)
				})}
			</div>
		</div>
	)
}
