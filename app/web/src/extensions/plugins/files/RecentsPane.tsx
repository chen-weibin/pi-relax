import { PlusIcon } from '../../../icons'
import { IconButton } from '../../../ui/IconButton'
import { mockRecents } from '../../contracts/adapters/mock'
import { selectFile } from './open'

export function RecentsPane() {
	return (
		<div className="flex h-full min-w-0 flex-col px-3 py-3">
			<button
				type="button"
				title="新建文件（待接 FsApi）"
				className="mb-4 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-surface text-sm text-fg-2 transition-colors duration-100 hover:bg-surface-hover hover:text-fg-bright"
				onClick={() => {
					// 占位：后端实现 create 后再接到 FsApi
				}}
			>
				<PlusIcon />
				New File
			</button>
			<div className="mb-2 text-xs text-fg-3">Recents</div>
			<div className="flex flex-col gap-0.5">
				{mockRecents.map((entry) => (
					<button
						key={entry.path}
						type="button"
						onClick={() => selectFile(entry.path)}
						className="flex h-[30px] w-full cursor-pointer items-center rounded-md px-2.5 text-left text-sm text-fg-2 transition-colors duration-100 hover:bg-surface-hover hover:text-fg-bright"
					>
						<span className="min-w-0 truncate">{entry.name}</span>
					</button>
				))}
			</div>
		</div>
	)
}
