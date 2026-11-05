import { useEffect } from 'react'
import classNames from 'classnames'
import { ChevronRightIcon, FolderIcon } from '../../../icons'
import { useCatalogStore } from '../../../store/catalog'
import '../../../styles/scrollbar.css'
import { IconButton } from '../../../ui/IconButton'
import { PaneHeader } from '../../../ui/PaneHeader'
import { watchDirectory } from '../../contracts/adapters/fsWatch'
import { currentExtensionCwd } from '../../sessionTabs'
import { useExtensionStore } from '../../store'
import type { PluginRenderProps } from '../../types'
import { applyRemote } from './drafts'
import { FilePreview } from './FilePreview'
import { FileTree } from './FileTree'
import { fileNameFromPath, isFilesPayload, selectFile } from './open'
import { useFilesTreeStore } from './treeStore'

export const FILES_NAV_WIDTH = 240

function FilePathBreadcrumb({ path }: { path: string }) {
	const parts = path.split('/').filter(Boolean)
	return (
		<div className="flex min-w-0 items-center gap-1 overflow-hidden px-1 text-xs text-fg-3">
			{parts.map((part, index) => (
				<span key={`${part}-${index}`} className="flex min-w-0 shrink items-center gap-1">
					{index > 0 && (
						<span className="inline-flex h-2.5 w-2.5 shrink-0 [&_svg]:h-2.5 [&_svg]:w-2.5">
							<ChevronRightIcon />
						</span>
					)}
					<span
						className={
							index === parts.length - 1 ? 'shrink-0 text-fg-2' : 'min-w-0 truncate'
						}
					>
						{part}
					</span>
				</span>
			))}
		</div>
	)
}

function FilesNav({ selectedPath }: { selectedPath?: string }) {
	const root = useFilesTreeStore((s) => s.root)
	const label = root ? fileNameFromPath(root) : ''

	return (
		<div
			className="flex h-full min-h-0 shrink-0 flex-col"
			style={{ width: FILES_NAV_WIDTH }}
		>
			<div className="flex h-9 shrink-0 items-center px-2.5">
				<span className="min-w-0 truncate text-sm text-fg-2" title={root ?? undefined}>
					{label}
				</span>
			</div>
			<div className="scrollbar-shallow min-h-0 flex-1 overflow-y-auto px-1">
				<FileTree selectedPath={selectedPath} onSelectFile={selectFile} />
			</div>
		</div>
	)
}

export function FilesView({ tab }: PluginRenderProps) {
	const navOpen = useFilesTreeStore((s) => s.navOpen)
	const setNavOpen = useFilesTreeStore((s) => s.setNavOpen)
	useCatalogStore((s) => s.defaultCwd)
	const cwd = currentExtensionCwd()
	const payload = isFilesPayload(tab.payload) ? tab.payload : { kind: 'explorer' as const }
	const path = payload.kind === 'file' ? payload.path : undefined

	useEffect(() => {
		useFilesTreeStore.getState().syncRoot(cwd)
		if (!cwd) return
		return watchDirectory(cwd, (changes) => {
			useFilesTreeStore.getState().refreshListed(changes)
			for (const open of useExtensionStore.getState().tabs) {
				if (open.pluginId !== 'files' || !isFilesPayload(open.payload) || open.payload.kind !== 'file') continue
				void applyRemote(open.payload.path, changes)
			}
		})
	}, [cwd])

	return (
		<div className="flex h-full min-h-0 flex-col bg-app">
			<PaneHeader
				left={path ? <FilePathBreadcrumb path={path} /> : undefined}
				right={
					<IconButton
						title={navOpen ? '收起文件列表' : '展开文件列表'}
						aria-pressed={navOpen}
						onClick={() => setNavOpen((open) => !open)}
					>
						<FolderIcon />
					</IconButton>
				}
			/>
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<div className="min-h-0 min-w-0 flex-1">
					{payload.kind === 'file' ? (
						<FilePreview payload={payload} />
					) : (
						<div className="flex h-full items-center justify-center text-sm text-fg-3">选择一个文件</div>
					)}
				</div>
				<div
					aria-hidden={!navOpen}
					className={classNames(
						'shrink-0 overflow-hidden bg-panel transition-[width] duration-200 ease-out motion-reduce:transition-none',
						navOpen ? 'border-l border-border' : 'pointer-events-none',
					)}
					style={{ width: navOpen ? FILES_NAV_WIDTH : 0 }}
				>
					<FilesNav selectedPath={path} />
				</div>
			</div>
		</div>
	)
}
