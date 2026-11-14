import classNames from 'classnames'
import type { IconEntry } from './catalog'
import { message } from '../ui/Message'

type IconGridProps = {
	entries: IconEntry[]
	/** 套在整网格上的颜色类（可着色页用） */
	className?: string
}

async function copyName(name: string) {
	try {
		await navigator.clipboard.writeText(name)
		message.success(`已复制 ${name}`)
	} catch {
		message.error('复制失败')
	}
}

export function IconGrid({ entries, className }: IconGridProps) {
	return (
		<div
			className={classNames(
				'grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2',
				className,
			)}
		>
			{entries.map(({ name, Icon, props }) => (
				<button
					key={name}
					type="button"
					title={`复制 ${name}`}
					onClick={() => void copyName(name)}
					className="flex flex-col items-center gap-2.5 rounded-lg border border-transparent px-2 py-4 text-center transition-colors hover:border-border-hover hover:bg-surface-hover"
				>
					<span className="flex h-10 w-10 items-center justify-center [&_svg]:h-7 [&_svg]:w-7">
						<Icon {...props} />
					</span>
					<span className="w-full truncate font-mono text-xs text-fg-2">{name}</span>
				</button>
			))}
		</div>
	)
}
