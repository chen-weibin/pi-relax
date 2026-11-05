import { useEffect, type MouseEvent } from 'react'
import classNames from 'classnames'
import { ChevronRightIcon, FolderClosedIcon, FolderOpenIcon } from '../../../../icons'
import { DotMatrix } from '../../../../ui/DotMatrix'
import { Expandable } from '../../../../ui/Expandable'
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
	selectedPath,
	onSelectFile,
}: {
	entry: FsEntry
	depth: number
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
				<TreeChildren
					entries={children ?? []}
					depth={depth + 1}
					selectedPath={selectedPath}
					onSelectFile={onSelectFile}
				/>
			</Expandable>
		</div>
	)
}

function TreeChildren({
	entries,
	depth,
	selectedPath,
	onSelectFile,
}: {
	entries: FsEntry[]
	depth: number
	selectedPath?: string
	onSelectFile: (path: string) => void
}) {
	return (
		<div className="flex flex-col gap-[2px]">
			{entries.map((child) =>
				child.kind === 'dir' ? (
					<FileTreeDir
						key={child.path}
						entry={child}
						depth={depth}
						selectedPath={selectedPath}
						onSelectFile={onSelectFile}
					/>
				) : (
					<FileTreeRow
						key={child.path}
						entry={child}
						depth={depth}
						selected={child.path === selectedPath}
						onSelectFile={onSelectFile}
					/>
				),
			)}
		</div>
	)
}

export type FileTreeProps = {
	selectedPath?: string
	onSelectFile: (path: string) => void
}

export function FileTree({ selectedPath, onSelectFile }: FileTreeProps) {
	const root = useFilesTreeStore((s) => s.root)
	const children = useFilesTreeStore((s) => (root ? s.childrenByPath[root] : undefined))
	const loading = useFilesTreeStore((s) => (root ? Boolean(s.loading[root]) : false))
	const rootError = useFilesTreeStore((s) => s.rootError)

	if (!root) return null
	if (rootError && !children) {
		return <div className="px-2.5 py-2 text-sm text-fg-3">{rootError}</div>
	}
	if (loading && !children) {
		return (
			<div className="flex h-[30px] items-center px-2">
				<DotMatrix size="xs" label="加载中" />
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-[2px] pb-2">
			<TreeChildren
				entries={children ?? []}
				depth={0}
				selectedPath={selectedPath}
				onSelectFile={onSelectFile}
			/>
		</div>
	)
}
