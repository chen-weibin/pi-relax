import { useEffect, useRef, useSyncExternalStore } from 'react'
import classNames from 'classnames'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { Composer } from '../Composer'
import { ConversationView } from './ConversationView'
import { createBlockRuntime, isRunBusy, type ConversationSnapshot } from '../../conversation'
import { DevToolbar } from '../../mock/conversation/DevToolbar'
import { useMockFeed } from '../../mock/conversation/useMockFeed'
import '../../styles/scrollbar.css'

interface Props {
	className?: string
}

const COLUMN = 'mx-auto w-full max-w-[800px] px-4'

export function Conversation({ className }: Props) {
	const runtimeRef = useRef(createBlockRuntime())
	const runtime = runtimeRef.current
	const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
	const { loadHistory, playStream } = useMockFeed(runtime)
	const busy = isRunBusy(snapshot.runPhase)

	return (
		<StickToBottom
			className={classNames('flex min-h-0 flex-1 flex-col', className)}
			resize="instant"
			initial="instant"
		>
			<ConversationChrome
				snapshot={snapshot}
				busy={busy}
				loadHistory={loadHistory}
				playStream={playStream}
			/>
		</StickToBottom>
	)
}

function ConversationChrome({
	snapshot,
	busy,
	loadHistory,
	playStream,
}: {
	snapshot: ConversationSnapshot
	busy: boolean
	loadHistory: () => void
	playStream: () => void
}) {
	const { scrollToBottom } = useStickToBottomContext()

	useEffect(() => {
		loadHistory()
	}, [loadHistory])

	const pinBottom = () => {
		void scrollToBottom('instant')
	}

	return (
		<>
			<DevToolbar
				className={COLUMN}
				onLoadHistory={() => {
					loadHistory()
					pinBottom()
				}}
				onPlayStream={() => {
					playStream()
					pinBottom()
				}}
			/>
			<StickToBottom.Content
				scrollClassName="scrollbar-shallow scrollbar-shallow--static min-h-0 flex-1"
				className={COLUMN}
			>
				<ConversationView snapshot={snapshot} />
			</StickToBottom.Content>
			<div className={classNames(COLUMN, 'shrink-0 pb-4')}>
				<Composer disabled={busy} placeholder="发送消息…" onSubmit={pinBottom} />
			</div>
		</>
	)
}
