import classNames from 'classnames'
import {
	ChevronRightIcon,
	FolderClosedIcon,
	FolderOpenIcon,
	PlusIcon,
} from '../icons'
import { IconButton } from '../ui/IconButton'
import { SessionItem, type SessionItemProps } from './SessionItem'

export interface ProjectItemSession
	extends Pick<SessionItemProps, 'title' | 'createdAt' | 'active' | 'onClick' | 'status'> {
	id: string
}

export interface ProjectItemProps {
	name: string
	sessions: ProjectItemSession[]
	expanded: boolean
	active?: boolean
	onToggle: () => void
	onAddSession: () => void
}

export function ProjectItem({
	name,
	sessions,
	expanded,
	active = false,
	onToggle,
	onAddSession,
}: ProjectItemProps) {
	return (
		<div className="group/project flex flex-col select-none">
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
{expanded && sessions.length > 0 && (
				<div className="mt-0.5 flex flex-col gap-0.5">
					{sessions.map((s) => (
						<SessionItem
							key={s.id}
							title={s.title}
							createdAt={s.createdAt}
							{...(s.status ? { status: s.status } : {})}
							{...(s.active !== undefined ? { active: s.active } : {})}
							{...(s.onClick ? { onClick: s.onClick } : {})}
						/>
					))}
				</div>
			)}
		</div>
	)
}
