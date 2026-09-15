import classNames from 'classnames'
import type { ThinkingUiMode } from '../../components/conversation/thinking-mode'

export type DevToolbarProps = {
	className?: string
	thinkingUiMode: ThinkingUiMode
	onThinkingUiModeChange: (mode: ThinkingUiMode) => void
	onLoadHistory: () => void
	onPlayStream: () => void
}

/** Temporary conversation fixtures. Delete this file when real session feed lands. */
export function DevToolbar({
	className,
	thinkingUiMode,
	onThinkingUiModeChange,
	onLoadHistory,
	onPlayStream,
}: DevToolbarProps) {
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
			<button
				type="button"
				onClick={() =>
					onThinkingUiModeChange(
						thinkingUiMode === 'expand-typewriter' ? 'title-blink-only' : 'expand-typewriter',
					)
				}
				className="cursor-pointer rounded-md px-2 py-1 text-xs text-fg-3 hover:text-fg-2"
				title="思考块展示策略"
			>
				思考: {thinkingUiMode === 'expand-typewriter' ? '展开打字机' : '仅标题闪烁'}
			</button>
		</div>
	)
}
