import classNames from 'classnames'
import { AddFolderIcon, ChevronRightIcon, FilterIcon } from '../icons'
import { IconButton } from '../ui/IconButton'

export interface ProjectSectionHeaderProps {
	expanded: boolean
	onToggleExpand: () => void
	onFilter: () => void
	onAddProject: () => void
}

export function ProjectSectionHeader({
	expanded,
	onToggleExpand,
	onFilter,
	onAddProject,
}: ProjectSectionHeaderProps) {
	return (
		<div className="group/header flex h-[30px] items-center pl-1.5 select-none">
			<button
				type="button"
				onClick={onToggleExpand}
				aria-expanded={expanded}
				title={expanded ? '收起项目列表' : '展开项目列表'}
				className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2.5 text-left text-fg-2 transition-colors duration-100"
			>
				<span className="text-md">项目</span>
				<span
					className={classNames(
						'inline-flex h-2.5 w-2.5 items-center justify-center text-fg-2 opacity-0 transition-all duration-100 group-hover/header:opacity-100 [&_svg]:h-2.5 [&_svg]:w-2.5',
						expanded ? 'rotate-90' : 'rotate-0',
					)}
				>
					<ChevronRightIcon />
				</span>
			</button>
			<div className="flex items-center gap-0.5 pr-1">
				<IconButton title="过滤项目" onClick={onFilter}>
					<FilterIcon />
				</IconButton>
				<IconButton title="打开工作目录" onClick={onAddProject}>
					<AddFolderIcon />
				</IconButton>
			</div>
		</div>
	)
}
