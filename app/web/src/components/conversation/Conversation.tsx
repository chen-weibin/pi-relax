import { useRef, useState, useSyncExternalStore } from 'react'
import classNames from 'classnames'
import { Composer } from '../Composer'
import { ConversationView } from './ConversationView'
import type { ThinkingUiMode } from './thinking-mode'
import { createBlockRuntime, isRunBusy } from '../../conversation'
import { DevToolbar } from '../../mock/conversation/DevToolbar'
import { useMockFeed } from '../../mock/conversation/useMockFeed'

interface Props {
	className?: string
}

const COLUMN = 'mx-auto w-full max-w-[800px] px-4'

export function Conversation({ className }: Props) {
	const runtimeRef = useRef(createBlockRuntime())
	const runtime = runtimeRef.current
	const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
	const [thinkingUiMode, setThinkingUiMode] = useState<ThinkingUiMode>('expand-typewriter')
	const { loadHistory, playStream } = useMockFeed(runtime)
	const busy = isRunBusy(snapshot.runPhase)

	return (
		<div className={classNames('flex min-h-0 flex-1 flex-col', className)}>
			<DevToolbar
				className={COLUMN}
				thinkingUiMode={thinkingUiMode}
				onThinkingUiModeChange={setThinkingUiMode}
				onLoadHistory={loadHistory}
				onPlayStream={playStream}
			/>
			<ConversationView snapshot={snapshot} thinkingUiMode={thinkingUiMode} className={COLUMN} />
			<div className={classNames(COLUMN, 'shrink-0 pb-4')}>
				<Composer disabled={busy} placeholder="发送消息…" />
			</div>
		</div>
	)
}
