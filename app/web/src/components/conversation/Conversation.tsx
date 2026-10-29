import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import classNames from 'classnames'
import { motion } from 'motion/react'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { translateHistory } from '../../conversation/translateHistory'
import { createBlockRuntime, isRunBusy, type ConversationSnapshot } from '../../conversation'
import {
	getOpenSessionHistory,
	getTransportGeneration,
	getTransportSnapshot,
	subscribeTransport,
} from '../../session'
import { Composer } from '../Composer'
import { ConversationView } from './ConversationView'
import '../../styles/scrollbar.css'

interface Props {
	className?: string
}

type HistoryNotice = 'loading' | 'error' | null

const COLUMN = 'mx-auto w-full max-w-[800px] px-4'
const COMPOSER_EASE = [0.22, 1, 0.36, 1] as const

export function Conversation({ className }: Props) {
	const runtimeRef = useRef(createBlockRuntime())
	const runtime = runtimeRef.current
	const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
	const transport = useSyncExternalStore(subscribeTransport, getTransportSnapshot, getTransportSnapshot)
	const [notice, setNotice] = useState<HistoryNotice>(null)
	const busy = isRunBusy(snapshot.runPhase)
	const hasMessages = snapshot.messageOrder.length > 0
	const [docked, setDocked] = useState(false)
	const shouldDock = hasMessages || (transport.phase === 'loading' && docked)
	if (shouldDock !== docked) setDocked(shouldDock)

	useEffect(() => {
		if (transport.phase === 'error') {
			runtime.replace([])
			setNotice('error')
			return
		}
		if (transport.phase !== 'ready') {
			runtime.replace([])
			setNotice(transport.phase === 'loading' ? 'loading' : null)
			return
		}
		const generation = getTransportGeneration()
		const history = getOpenSessionHistory()
		if (!history) {
			runtime.replace([])
			setNotice('error')
			return
		}
		let cancelled = false
		setNotice('loading')
		void translateHistory(history.messages, generation, getTransportGeneration).then((messages) => {
			if (cancelled || !messages) return
			runtime.replace(messages)
			setNotice(null)
		})
		return () => {
			cancelled = true
		}
	}, [runtime, transport.openSessionId, transport.phase])

	return (
		<StickToBottom
			className={classNames('flex min-h-0 flex-1 flex-col', !docked && 'justify-center', className)}
			resize="instant"
			initial="instant"
		>
			<ConversationChrome snapshot={snapshot} notice={notice} busy={busy} docked={docked} />
		</StickToBottom>
	)
}

function HistoryNotice({ notice }: { notice: HistoryNotice }) {
	if (notice === 'loading') return <p className="py-3 text-center text-sm text-fg-3">加载中...</p>
	if (notice === 'error') return <p className="py-3 text-sm text-fg-3">历史加载失败</p>
	return null
}

function ConversationChrome({
	snapshot,
	notice,
	busy,
	docked,
}: {
	snapshot: ConversationSnapshot
	notice: HistoryNotice
	busy: boolean
	docked: boolean
}) {
	const { scrollToBottom } = useStickToBottomContext()

	return (
		<>
			{docked ? (
				<StickToBottom.Content
					scrollClassName="scrollbar-shallow scrollbar-shallow--static min-h-0 flex-1"
					className={COLUMN}
				>
					<HistoryNotice notice={notice} />
					<ConversationView snapshot={snapshot} />
				</StickToBottom.Content>
			) : (
				<HistoryNotice notice={notice} />
			)}
			<motion.div
				key="composer"
				layout
				initial={false}
				transition={{ layout: { duration: 0.4, ease: COMPOSER_EASE } }}
				className={
					docked
						? 'mx-auto mb-4 w-[min(768px,calc(100%-2rem))] shrink-0'
						: 'mx-auto w-[min(620px,calc(100%-2rem))]'
				}
			>
				<Composer
					disabled={busy}
					placeholder="发送消息…"
					onSubmit={() => {
						void scrollToBottom('instant')
					}}
				/>
			</motion.div>
		</>
	)
}
