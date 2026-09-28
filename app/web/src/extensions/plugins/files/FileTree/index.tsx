import { useEffect, type MouseEvent } from 'react'
import classNames from 'classnames'
import { ChevronRightIcon, FolderClosedIcon, FolderOpenIcon } from '../../../../icons'
import { DotMatrix } from '../../../../ui/DotMatrix'
import { Expandable } from '../../../../ui/Expandable'
import { FS_ROOT } from '../../../contracts/adapters/mock'
import type { FsEntry } from '../../../contracts/fs'
import { resolveFileKind } from '../fileKinds'
import { useFilesTreeStore } from '../treeStore'

function FileTreeRow({
	entry,
	depth,
	expanded,
	loading,
	selected,
	onToggle,
	onSelectFile,
}: {
	entry: FsEntry
	depth: number
	expanded?: boolean
	loading?: boolean
	selected?: boolean
	onToggle?: () => void
	onSelectFile?: (path: string) => void
}) {
	const isDir = entry.kind === 'dir'
	const FileKindIcon = isDir ? undefined : resolveFileKind(entry.path).icon

	const handleClick = (e: MouseEvent) => {
		e.preventDefault()
		if (isDir) onToggle?.()
		else onSelectFile?.(entry.path)
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			style={{ paddingLeft: 8 + depth * 12 }}
			className={classNames(
				'group/row flex h-[30px] w-full cursor-pointer items-center gap-2 rounded-md pr-2.5 text-left text-sm transition-colors duration-100',
				selected
					? 'bg-surface-active text-fg-bright'
					: 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
			)}
		>
			<span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
				{isDir && loading ? (
					<DotMatrix size="xs" label="加载中" />
				) : isDir ? (
					<>
						<span className="absolute inset-0 flex items-center justify-center text-fg-3 group-hover/row:hidden">
							{expanded ? <FolderOpenIcon /> : <FolderClosedIcon />}
						</span>
						<span className="absolute inset-0 hidden items-center justify-center text-fg-2 group-hover/row:flex">
							<span
								className={classNames(
									'inline-flex h-2.5 w-2.5 items-center justify-center transition-transform duration-100 [&_svg]:h-2.5 [&_svg]:w-2.5',
									expanded ? 'rotate-90' : 'rotate-0',
								)}
							>
								<ChevronRightIcon />
							</span>
						</span>
					</>
				) : (
					<span className="flex items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5">
						{FileKindIcon && <FileKindIcon />}
					</span>
				)}
			</span>
			<span className="min-w-0 truncate">{entry.name}</span>
		</button>
	)
}

function FileTreeDir({
	entry,
	depth,
	query,
	selectedPath,
	onSelectFile,
}: {
	entry: FsEntry
	depth: number
	query: string
	selectedPath?: string
	onSelectFile: (path: string) => void
}) {
	const expanded = useFilesTreeStore((s) => Boolean(s.expanded[entry.path]))
	const children = useFilesTreeStore((s) => s.childrenByPath[entry.path])
	const loading = useFilesTreeStore((s) => Boolean(s.loading[entry.path]))
	const toggleDir = useFilesTreeStore((s) => s.toggleDir)
	const ensureChildren = useFilesTreeStore((s) => s.ensureChildren)

	useEffect(() => {
		if (expanded) ensureChildren(entry.path)
	}, [expanded, entry.path, ensureChildren])

	return (
		<div className="flex flex-col gap-[2px]">
			<FileTreeRow
				entry={entry}
				depth={depth}
				expanded={expanded}
				loading={loading}
				onToggle={() => toggleDir(entry.path)}
			/>
			<Expandable open={expanded} duration={160}>
				<div className="flex flex-col gap-[2px]">
					{(children ?? [])
						.filter((child) => child.kind === 'dir' || matchesQuery(child, query))
						.map((child) =>
							child.kind === 'dir' ? (
								<FileTreeDir
									key={child.path}
									entry={child}
									depth={depth + 1}
									query={query}
									selectedPath={selectedPath}
									onSelectFile={onSelectFile}
								/>
							) : (
								<FileTreeRow
									key={child.path}
									entry={child}
									depth={depth + 1}
									selected={child.path === selectedPath}
									onSelectFile={onSelectFile}
								/>
							),
						)}
				</div>
			</Expandable>
		</div>
	)
}

function matchesQuery(entry: FsEntry, query: string) {
	const q = query.trim().toLowerCase()
	if (!q) return true
	return entry.name.toLowerCase().includes(q)
}

export type FileTreeProps = {
	selectedPath?: string
	onSelectFile: (path: string) => void
	query?: string
}

export function FileTree({ selectedPath, onSelectFile, query = '' }: FileTreeProps) {
	return (
		<div className="flex flex-col gap-[2px] pb-2">
			<FileTreeDir
				entry={{ name: FS_ROOT, path: FS_ROOT, kind: 'dir' }}
				depth={0}
				query={query}
				selectedPath={selectedPath}
				onSelectFile={onSelectFile}
			/>
		</div>
	)
}
