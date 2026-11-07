import classNames from 'classnames'
import { useModal } from '../hooks/useModal'
import {
	ChevronRightIcon,
	FolderClosedIcon,
	FolderOpenIcon,
	PlusIcon,
	TrashIcon,
} from '../icons'
import { ContextMenu } from '../ui/ContextMenu'
import type { DropdownPanel } from '../ui/Dropdown'
import { Expandable } from '../ui/Expandable'
import { IconButton } from '../ui/IconButton'
import { SessionItem, type SessionItemProps } from './SessionItem'

export interface ProjectItemSession
	extends Pick<SessionItemProps, 'title' | 'createdAt' | 'active' | 'onClick' | 'onRename' | 'onDelete' | 'status'> {
	id: string
}

export interface ProjectItemProps {
	name: string
	sessions: ProjectItemSession[]
	expanded: boolean
	active?: boolean
	onToggle: () => void
	onAddSession: () => void
	onRemove?: () => void | Promise<void>
	sessionNote?: string | null
	onLoadMoreSessions?: () => void
}

export function ProjectItem({
	name,
	sessions,
	expanded,
	active = false,
	onToggle,
	onAddSession,
	onRemove,
	sessionNote,
	onLoadMoreSessions,
}: ProjectItemProps) {
	const { confirm, holder } = useModal()
	const header = (
			<div className="group/row relative h-[30px] rounded-md">
				<button
					type="button"
					onClick={onToggle}
					className={classNames(
						'flex h-full w-full cursor-pointer items-center gap-2.5 rounded-md pl-2.5 pr-2.5 text-left transition-colors duration-100',
						'group-hover/row:pr-8',
						active
							? 'bg-surface-active text-fg-bright'
							: 'text-fg-2 group-hover/row:bg-surface-hover group-hover/row:text-fg-bright',
					)}
				>
					<span className="relative inline-block h-3.5 w-3.5 shrink-0">
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
					</span>
					<span className="min-w-0 flex-1 truncate text-sm">{name}</span>
				</button>
				<div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-100 group-hover/row:opacity-100 group-hover/row:pointer-events-auto">
					<IconButton
						size="sm"
						title="在当前项目下新建会话"
						className="[&_svg]:h-2.5 [&_svg]:w-2.5"
						onClick={(e) => {
							e.stopPropagation()
							onAddSession()
						}}
					>
						<PlusIcon />
					</IconButton>
				</div>
			</div>
	)
	const panel: DropdownPanel = {
		groups: [
			{
				rows: [
					{
						id: 'remove',
						label: '从侧边栏移除',
						icon: <TrashIcon />,
						onSelect: () => {
							if (!onRemove) return
							void confirm({
								title: '从侧边栏移除',
								body: '项目会从侧边栏消失，其中的会话还在。',
								onOk: () => onRemove(),
							})
						},
					},
				],
			},
		],
	}
	return (
		<div className="group/project flex flex-col select-none">
			{holder}
			{onRemove ? (
				<ContextMenu panel={panel} className="min-w-[200px]">
					{header}
				</ContextMenu>
			) : (
				header
			)}
			<Expandable open={expanded} duration={200}>
				{sessions.length > 0 || sessionNote || onLoadMoreSessions ? (
					<div className="mt-0.5 flex flex-col gap-0.5">
						{sessions.map((s) => (
							<SessionItem
								key={s.id}
								title={s.title}
								createdAt={s.createdAt}
								{...(s.status ? { status: s.status } : {})}
								{...(s.active !== undefined ? { active: s.active } : {})}
								{...(s.onClick ? { onClick: s.onClick } : {})}
								{...(s.onRename ? { onRename: s.onRename } : {})}
								{...(s.onDelete ? { onDelete: s.onDelete } : {})}
							/>
						))}
						{sessionNote ? <p className="px-3 py-1 text-xs text-fg-3">{sessionNote}</p> : null}
						{onLoadMoreSessions ? (
							<button
								type="button"
								className="px-3 py-1 text-left text-xs text-fg-3 hover:text-fg-2"
								onClick={onLoadMoreSessions}
							>
								更多
							</button>
						) : null}
					</div>
				) : null}
			</Expandable>
		</div>
	)
}
