import { useExtensionStore } from '../store'
import { extensionPlugins } from '../registry'

export function ExtensionWelcome() {
	const openPlugin = useExtensionStore((s) => s.openPlugin)

	return (
		<div className="flex h-full w-full items-center justify-center px-6">
			<div className="flex max-w-full flex-wrap items-center justify-center gap-3">
				{extensionPlugins.map((plugin) => {
					const Icon = plugin.icon
					return (
						<button
							key={plugin.id}
							type="button"
							onClick={() => openPlugin(plugin.id)}
							className="group flex h-[100px] w-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border bg-transparent text-sm text-fg transition-colors duration-100 hover:border-white/12 hover:bg-surface"
						>
							<span className="text-fg-3 transition-colors duration-100 group-hover:text-fg-2 [&_svg]:h-[18px] [&_svg]:w-[18px]">
								<Icon />
							</span>
							<span>{plugin.title}</span>
						</button>
					)
				})}
			</div>
		</div>
	)
}
