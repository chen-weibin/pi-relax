import classNames from 'classnames'

export type DevToolbarProps = {
	className?: string
	onLoadHistory: () => void
	onPlayStream: () => void
}

/** Temporary conversation fixtures. Delete this file when real session feed lands. */
export function DevToolbar({ className, onLoadHistory, onPlayStream }: DevToolbarProps) {
	return (
		<div className={classNames('flex shrink-0 flex-wrap items-center gap-2 py-2', className)}>
			<button
				type="button"
				onClick={onLoadHistory}
				className="cursor-pointer rounded-md border border-border px-2 py-1 text-sm text-fg-2 hover:border-border-hover hover:text-fg"
			>
				历史渲染
			</button>
			<button
				type="button"
				onClick={onPlayStream}
				className="cursor-pointer rounded-md border border-border px-2 py-1 text-sm text-fg-2 hover:border-border-hover hover:text-fg"
			>
				模拟流式
			</button>
		</div>
	)
}
