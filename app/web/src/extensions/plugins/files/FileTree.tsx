import { useEffect, useState, type MouseEvent } from 'react'
import classNames from 'classnames'
import { ChevronRightIcon, FileIcon, FolderClosedIcon, FolderOpenIcon } from '../../../icons'
import { Expandable } from '../../../ui/Expandable'
import { mockFs } from '../../contracts/adapters/mock'
import type { FsEntry } from '../../contracts/fs'
import { openFileTab } from './open'

function FileTreeRow({
	entry,
	depth,
	expanded,
	onToggle,
	onOpenFile,
}: {
	entry: FsEntry
	depth: number
	expanded?: boolean
	onToggle?: () => void
	onOpenFile?: (path: string) => void
}) {
	const isDir = entry.kind === 'dir'

	const handleClick = (e: MouseEvent) => {
		e.preventDefault()
		if (isDir) onToggle?.()
		else onOpenFile?.(entry.path)
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			style={{ paddingLeft: 8 + depth * 12 }}
			className="group/row flex h-[30px] w-full cursor-pointer items-center gap-2 rounded-md pr-2.5 text-left text-sm text-fg-2 transition-colors duration-100 hover:bg-surface-hover hover:text-fg-bright"
		>
			<span className="relative inline-block h-3.5 w-3.5 shrink-0">
				{isDir ? (
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
					<span className="flex items-center justify-center text-fg-3">
						<FileIcon />
					</span>
				)}
			</span>
			<span className="min-w-0 truncate">{entry.name}</span>
		</button>
	)
}

function FileTreeDir({ entry, depth, query }: { entry: FsEntry; depth: number; query: string }) {
	const [expanded, setExpanded] = useState(depth === 0)
	const [children, setChildren] = useState<FsEntry[] | null>(null)

	useEffect(() => {
		if (!expanded || children) return
		let cancelled = false
		void mockFs.list(entry.path).then((listed) => {
			if (!cancelled) setChildren(listed)
		})
		return () => {
			cancelled = true
		}
	}, [expanded, children, entry.path])

	const toggle = () => {
		setExpanded((open) => !open)
	}

	return (
		<div className="flex flex-col">
			<FileTreeRow entry={entry} depth={depth} expanded={expanded} onToggle={toggle} />
			<Expandable open={expanded} duration={160}>
				<div className="flex flex-col">
					{(children ?? [])
						.filter((child) => child.kind === 'dir' || matchesQuery(child, query))
						.map((child) =>
							child.kind === 'dir' ? (
								<FileTreeDir key={child.path} entry={child} depth={depth + 1} query={query} />
							) : (
								<FileTreeRow
									key={child.path}
									entry={child}
									depth={depth + 1}
									onOpenFile={openFileTab}
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

export function FileTree({
	root,
	query = '',
}: {
	root: FsEntry
	query?: string
}) {
	return (
		<div className="flex flex-col pb-2">
			<FileTreeDir entry={root} depth={0} query={query} />
		</div>
	)
}
