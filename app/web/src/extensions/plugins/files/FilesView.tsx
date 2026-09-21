import { useState } from 'react'
import '../../../styles/scrollbar.css'
import { SearchInput } from '../../../ui/SearchInput'
import { FS_ROOT } from '../../contracts/adapters/mock'
import type { PluginRenderProps } from '../../types'
import { FilePreview } from './FilePreview'
import { FileTree } from './FileTree'
import { RecentsPane } from './RecentsPane'
import { isFilesPayload } from './open'

export function FilesView({ tab }: PluginRenderProps) {
	const payload = isFilesPayload(tab.payload) ? tab.payload : { kind: 'explorer' as const }

	if (payload.kind === 'file') {
		return <FilePreview payload={payload} />
	}

	return <RecentsPane />
}

export function FilesSide({ tab: _tab }: PluginRenderProps) {
	const [query, setQuery] = useState('')

	return (
		<div className="flex h-full min-h-0 w-[240px] shrink-0 flex-col border-l border-border">
			<div className="px-2 py-2">
				<SearchInput
					value={query}
					onChange={setQuery}
					placeholder="Files, Folders..."
					variant="bordered"
				/>
			</div>
			<div className="scrollbar-shallow min-h-0 flex-1 overflow-y-auto px-1">
				<FileTree root={{ name: FS_ROOT, path: FS_ROOT, kind: 'dir' }} query={query} />
			</div>
		</div>
	)
}
