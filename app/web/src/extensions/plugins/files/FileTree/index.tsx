import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import classNames from 'classnames'
import { useModal } from '../../../../hooks/useModal'
import {
	AddFileIcon,
	AddFolderIcon,
	ChevronRightIcon,
	FileUnknownIcon,
	FolderClosedIcon,
	FolderOpenIcon,
} from '../../../../icons'
import { ContextMenu } from '../../../../ui/ContextMenu'
import type { DropdownPanel } from '../../../../ui/Dropdown'
import { DotMatrix } from '../../../../ui/DotMatrix'
import { EmptyState } from '../../../../ui/EmptyState'
import { Expandable } from '../../../../ui/Expandable'
import { IconButton } from '../../../../ui/IconButton'
import { fsApi } from '../../../contracts/adapters/fsHttp'
import type { FsEntry } from '../../../contracts/fs'
import { discardDraftsUnder, remapDrafts } from '../drafts'
import { resolveFileKind } from '../fileKinds'
import { closeOpenFilesUnder, remapOpenFiles } from '../open'
import { renameSelectEnd } from '../renameSelect'
import { joinFsPath, parentDirPath, useFilesTreeStore, type CreateKind } from '../treeStore'

const CREATE_MENU_WIDTH = 160

function entryPanel(handlers: {
	onAddFile: () => void
	onAddDir: () => void
	onRename: () => void
	onDelete: () => void
}): DropdownPanel {
	return {
		width: CREATE_MENU_WIDTH,
		groups: [
			{
				rows: [
					{ id: 'add-file', label: '添加文件', onSelect: handlers.onAddFile },
					{ id: 'add-dir', label: '添加目录', onSelect: handlers.onAddDir },
				],
			},
			{
				rows: [
					{ id: 'rename', label: '重命名', onSelect: handlers.onRename },
					{ id: 'delete', label: '删除', onSelect: handlers.onDelete },
				],
			},
		],
	}
}

function CreateActions({
	onCreateFile,
	onCreateDir,
	className,
}: {
	onCreateFile: () => void
	onCreateDir: () => void
	className?: string
}) {
	return (
		<span
			className={classNames('flex shrink-0 items-center gap-0.5', className)}
			onClick={(e) => e.stopPropagation()}
			onMouseDown={(e) => e.stopPropagation()}
		>
			<IconButton
				size="sm"
				title="新建文件"
				aria-label="新建文件"
				onClick={(e) => {
					e.stopPropagation()
					onCreateFile()
				}}
			>
				<AddFileIcon />
			</IconButton>
			<IconButton
				size="sm"
				title="新建目录"
				aria-label="新建目录"
				onClick={(e) => {
					e.stopPropagation()
					onCreateDir()
				}}
			>
				<AddFolderIcon />
			</IconButton>
		</span>
	)
}

function CreateInputRow({
	parentPath,
	kind,
	depth,
	siblings,
	onSelectFile,
}: {
	parentPath: string
	kind: CreateKind
	depth: number
	siblings: FsEntry[]
	onSelectFile: (path: string) => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const closed = useRef(false)
	const [draft, setDraft] = useState('')
	const cancelCreate = useFilesTreeStore((s) => s.cancelCreate)
	const setSelectedDir = useFilesTreeStore((s) => s.setSelectedDir)
	const expandDir = useFilesTreeStore((s) => s.expandDir)
	const reloadChildren = useFilesTreeStore((s) => s.reloadChildren)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	function finish(save: boolean) {
		if (closed.current) return
		closed.current = true
		const name = draft.trim()
		if (!save || !name) {
			cancelCreate()
			return
		}
		if (siblings.some((entry) => entry.name === name)) {
			cancelCreate()
			return
		}
		const path = joinFsPath(parentPath, name)
		const run =
			kind === 'file'
				? fsApi.write(path, '').then(() => {
						onSelectFile(path)
					})
				: fsApi.mkdir(path).then(() => {
						setSelectedDir(path)
						expandDir(path)
					})
		void run
			.then(() => reloadChildren(parentPath))
			.catch((err: unknown) => {
				console.error(err)
			})
			.finally(() => {
				cancelCreate()
			})
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			event.preventDefault()
			finish(true)
		} else if (event.key === 'Escape') {
			event.preventDefault()
			finish(false)
		}
	}

	return (
		<div
			style={{ paddingLeft: 8 + depth * 12 }}
			className="flex h-[30px] w-full items-center gap-2 rounded-md bg-surface-active pr-2.5 text-sm text-fg-bright"
		>
			<span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-fg-3 [&_svg]:h-3.5 [&_svg]:w-3.5">
				{kind === 'dir' ? <FolderClosedIcon /> : <FileUnknownIcon />}
			</span>
			<input
				ref={inputRef}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => finish(true)}
				onKeyDown={onKeyDown}
				className="min-w-0 flex-1 bg-transparent p-0 text-sm text-inherit outline-none"
				aria-label={kind === 'dir' ? '新目录名' : '新文件名'}
			/>
		</div>
	)
}

function RenameInputRow({
	entry,
	depth,
	siblings,
}: {
	entry: FsEntry
	depth: number
	siblings: FsEntry[]
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const closed = useRef(false)
	const [draft, setDraft] = useState(entry.name)
	const cancelRename = useFilesTreeStore((s) => s.cancelRename)
	const FileKindIcon = entry.kind === 'dir' ? undefined : resolveFileKind(entry.path).icon

	useEffect(() => {
		const input = inputRef.current
		if (!input) return
		input.focus()
		input.setSelectionRange(0, renameSelectEnd(entry.name, entry.kind))
	}, [entry.name, entry.kind])

	function finish(save: boolean) {
		if (closed.current) return
		closed.current = true
		const name = draft.trim()
		const parent = parentDirPath(entry.path)
		if (!save || !name || !parent || name === entry.name) {
			cancelRename()
			return
		}
		if (siblings.some((sibling) => sibling.path !== entry.path && sibling.name === name)) {
			cancelRename()
			return
		}
		const next = joinFsPath(parent, name)
		const store = useFilesTreeStore.getState()
		const selectedDir = store.selectedDir
		const wasExpanded = Boolean(store.expanded[entry.path])
		void fsApi
			.rename(entry.path, next)
			.then(async () => {
				remapDrafts(entry.path, next)
				remapOpenFiles(entry.path, next)
				const selectedWasHere =
					selectedDir === entry.path || Boolean(selectedDir?.startsWith(`${entry.path}/`))
				store.forgetSubtree(entry.path)
				if (selectedWasHere) {
					store.setSelectedDir(
						selectedDir === entry.path
							? next
							: selectedDir
								? next + selectedDir.slice(entry.path.length)
								: next,
					)
				}
				await store.reloadChildren(parent)
				if (entry.kind === 'dir' && wasExpanded) store.expandDir(next)
			})
			.catch((err: unknown) => {
				console.error(err)
			})
			.finally(() => {
				cancelRename()
			})
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			event.preventDefault()
			finish(true)
		} else if (event.key === 'Escape') {
			event.preventDefault()
			finish(false)
		}
	}

	return (
		<div
			style={{ paddingLeft: 8 + depth * 12 }}
			className="flex h-[30px] w-full items-center gap-2 rounded-md bg-surface-active pr-2.5 text-sm text-fg-bright"
		>
			<span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-fg-3 [&_svg]:h-3.5 [&_svg]:w-3.5">
				{entry.kind === 'dir' ? (
					<FolderClosedIcon />
				) : FileKindIcon ? (
					<FileKindIcon />
				) : (
					<FileUnknownIcon />
				)}
			</span>
			<input
				ref={inputRef}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => finish(true)}
				onKeyDown={onKeyDown}
				className="min-w-0 flex-1 bg-transparent p-0 text-sm text-inherit outline-none"
				aria-label="重命名"
			/>
		</div>
	)
}

async function deleteEntry(entry: FsEntry) {
	const parent = parentDirPath(entry.path)
	if (entry.kind === 'file') await fsApi.removeFile(entry.path)
	else await fsApi.removeDir(entry.path, true)
	discardDraftsUnder(entry.path)
	closeOpenFilesUnder(entry.path)
	useFilesTreeStore.getState().forgetSubtree(entry.path)
	if (parent) await useFilesTreeStore.getState().reloadChildren(parent)
}

function FileTreeRow({
	entry,
	depth,
	expanded,
	loading,
	selected,
	showCreateActions,
	onToggle,
	onSelectFile,
	onSelectDir,
	onCreateFile,
	onCreateDir,
}: {
	entry: FsEntry
	depth: number
	expanded?: boolean
	loading?: boolean
	selected?: boolean
	showCreateActions?: boolean
	onToggle?: () => void
	onSelectFile?: (path: string) => void
	onSelectDir?: (path: string) => void
	onCreateFile?: () => void
	onCreateDir?: () => void
}) {
	const isDir = entry.kind === 'dir'
	const FileKindIcon = isDir ? undefined : resolveFileKind(entry.path).icon
	const beginRename = useFilesTreeStore((s) => s.beginRename)
	const beginCreate = useFilesTreeStore((s) => s.beginCreate)
	const { confirm, holder } = useModal()

	const handleClick = (e: MouseEvent) => {
		e.preventDefault()
		if (isDir) {
			onSelectDir?.(entry.path)
			onToggle?.()
		} else {
			onSelectFile?.(entry.path)
		}
	}

	const handleDoubleClick = (e: MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		beginRename(entry.path)
	}

	const row = (
		<div
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onDoubleClick={handleDoubleClick}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					handleClick(event as unknown as MouseEvent)
				}
			}}
			style={{ paddingLeft: 8 + depth * 12 }}
			className={classNames(
				'group/row flex h-[30px] w-full cursor-pointer items-center gap-2 rounded-md pr-1 text-left text-sm transition-colors duration-100',
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
			<span className="min-w-0 flex-1 truncate">{entry.name}</span>
			{showCreateActions && onCreateFile && onCreateDir ? (
				<CreateActions
					className="opacity-0 group-hover/row:opacity-100 focus-within:opacity-100"
					onCreateFile={onCreateFile}
					onCreateDir={onCreateDir}
				/>
			) : null}
		</div>
	)

	const addFile = () => {
		if (isDir) beginCreate(entry.path, 'file')
		else {
			const parent = parentDirPath(entry.path)
			if (parent) beginCreate(parent, 'file', entry.path)
		}
	}
	const addDir = () => {
		if (isDir) beginCreate(entry.path, 'dir')
		else {
			const parent = parentDirPath(entry.path)
			if (parent) beginCreate(parent, 'dir', entry.path)
		}
	}

	if (!isDir && !parentDirPath(entry.path)) return row

	const panel = entryPanel({
		onAddFile: addFile,
		onAddDir: addDir,
		onRename: () => beginRename(entry.path),
		onDelete: () => {
			confirm({
				title: isDir ? '删除目录' : '删除文件',
				body: isDir
					? `将删除「${entry.name}」及其全部内容，此操作不可撤销。`
					: `将删除「${entry.name}」，此操作不可撤销。`,
				onOk: () => {
					void deleteEntry(entry).catch((err: unknown) => {
						console.error(err)
					})
				},
			})
		},
	})

	return (
		<>
			{holder}
			<ContextMenu panel={panel}>{row}</ContextMenu>
		</>
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
	const selectedDir = useFilesTreeStore((s) => s.selectedDir)
	const renamingPath = useFilesTreeStore((s) => s.renamingPath)
	const toggleDir = useFilesTreeStore((s) => s.toggleDir)
	const ensureChildren = useFilesTreeStore((s) => s.ensureChildren)
	const setSelectedDir = useFilesTreeStore((s) => s.setSelectedDir)
	const beginCreate = useFilesTreeStore((s) => s.beginCreate)
	const parent = parentDirPath(entry.path)
	const siblings = useFilesTreeStore((s) => (parent ? (s.childrenByPath[parent] ?? []) : []))

	useEffect(() => {
		if (expanded) ensureChildren(entry.path)
	}, [expanded, entry.path, ensureChildren])

	function handleSelectFile(path: string) {
		setSelectedDir(null)
		onSelectFile(path)
	}

	return (
		<div className="flex flex-col">
			{renamingPath === entry.path ? (
				<RenameInputRow entry={entry} depth={depth} siblings={siblings} />
			) : (
				<FileTreeRow
					entry={entry}
					depth={depth}
					expanded={expanded}
					loading={loading}
					selected={entry.path === selectedDir}
					showCreateActions
					onToggle={() => toggleDir(entry.path)}
					onSelectDir={(path) => setSelectedDir(path)}
					onCreateFile={() => beginCreate(entry.path, 'file')}
					onCreateDir={() => beginCreate(entry.path, 'dir')}
				/>
			)}
			<Expandable open={expanded} duration={160}>
				<div className="pt-[2px]">
					<TreeChildren
						parentPath={entry.path}
						entries={children ?? []}
						depth={depth + 1}
						selectedPath={selectedPath}
						onSelectFile={handleSelectFile}
					/>
				</div>
			</Expandable>
		</div>
	)
}

function TreeChildren({
	parentPath,
	entries,
	depth,
	selectedPath,
	onSelectFile,
}: {
	parentPath: string
	entries: FsEntry[]
	depth: number
	selectedPath?: string
	onSelectFile: (path: string) => void
}) {
	const creating = useFilesTreeStore((s) => s.creating)
	const renamingPath = useFilesTreeStore((s) => s.renamingPath)
	const creatingHere = creating?.parentPath === parentPath ? creating : null
	const createAtStart = creatingHere && !creatingHere.beforePath

	return (
		<div className="flex flex-col gap-[2px]">
			{createAtStart ? (
				<CreateInputRow
					parentPath={parentPath}
					kind={creatingHere.kind}
					depth={depth}
					siblings={entries}
					onSelectFile={onSelectFile}
				/>
			) : null}
			{entries.map((child) => (
				<div key={child.path} className="flex flex-col gap-[2px]">
					{creatingHere?.beforePath === child.path ? (
						<CreateInputRow
							parentPath={parentPath}
							kind={creatingHere.kind}
							depth={depth}
							siblings={entries}
							onSelectFile={onSelectFile}
						/>
					) : null}
					{child.kind === 'dir' ? (
						<FileTreeDir
							entry={child}
							depth={depth}
							selectedPath={selectedPath}
							onSelectFile={onSelectFile}
						/>
					) : renamingPath === child.path ? (
						<RenameInputRow entry={child} depth={depth} siblings={entries} />
					) : (
						<FileTreeRow
							entry={child}
							depth={depth}
							selected={child.path === selectedPath}
							onSelectFile={onSelectFile}
						/>
					)}
				</div>
			))}
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
	const setSelectedDir = useFilesTreeStore((s) => s.setSelectedDir)
	const creating = useFilesTreeStore((s) => s.creating)

	function handleSelectFile(path: string) {
		setSelectedDir(null)
		onSelectFile(path)
	}

	if (!root) return null
	if (rootError && !children) {
		return <div className="px-2.5 py-2 text-sm text-fg-3">{rootError}</div>
	}
	if (loading && !children && creating?.parentPath !== root) {
		return (
			<div className="flex h-[30px] items-center px-2">
				<DotMatrix size="xs" label="加载中" />
			</div>
		)
	}
	if (children && children.length === 0 && creating?.parentPath !== root) {
		return <EmptyState placement="top">工作目录为空</EmptyState>
	}

	return (
		<div
			className="flex min-h-full flex-col gap-[2px] pb-2"
			onClick={(event) => {
				if (event.target === event.currentTarget) setSelectedDir(null)
			}}
		>
			<TreeChildren
				parentPath={root}
				entries={children ?? []}
				depth={0}
				selectedPath={selectedPath}
				onSelectFile={handleSelectFile}
			/>
		</div>
	)
}
