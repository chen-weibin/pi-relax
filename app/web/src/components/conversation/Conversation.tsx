import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import classNames from 'classnames'
import { motion } from 'motion/react'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { adaptAgentSession } from '../../conversation/adaptAgentSession'
import { historyToMessages } from '../../conversation/historyMessages'
import { translateHistory } from '../../conversation/translateHistory'
import { createBlockRuntime, isRunBusy, type ConversationSnapshot } from '../../conversation'
import {
	abortConversation,
	getOpenSessionHistory,
	getStreamingDraft,
	getTransportGeneration,
	getTransportSnapshot,
	releaseOpenSession,
	sendConversation,
	subscribeOpenSessionEvents,
	subscribeTransport,
} from '../../session'
import { noteModelSession } from '../../session/modelPicker'
import { enqueue, removePending, takeHead, type PendingMessage } from '../../session/pendingQueue'
import { useCatalogStore } from '../../store'
import { Composer } from '../Composer'
import { ModelPicker } from '../ModelPicker'
import { ConversationView } from './ConversationView'
import '../../styles/scrollbar.css'

interface Props {
	className?: string
}

type HistoryNotice = 'loading' | 'error' | null

const COLUMN = 'mx-auto w-full max-w-[800px] px-4'
const COMPOSER_EASE = [0.22, 1, 0.36, 1] as const
/** 库不认 CSS 的 smooth，对象才会走弹簧。只给「多了一条用户消息」那一下。 */
const SEND_SCROLL = { damping: 0.85, stiffness: 0.04, mass: 1.2 } as const
const SEND_SCROLL_MS = 800

function catalogRunning(sessionId: string): boolean {
	for (const page of Object.values(useCatalogStore.getState().sessionPages)) {
		const hit = page.sessions.find((session) => session.id === sessionId)
		if (hit) return hit.status === 'running'
	}
	return false
}

export function Conversation({ className }: Props) {
	const runtimeRef = useRef(createBlockRuntime())
	const runtime = runtimeRef.current
	const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
	const transport = useSyncExternalStore(subscribeTransport, getTransportSnapshot, getTransportSnapshot)
	const catalogStatus = useCatalogStore((state) => {
		const id = transport.openSessionId
		if (!id) return 'idle' as const
		for (const page of Object.values(state.sessionPages)) {
			const hit = page.sessions.find((session) => session.id === id)
			if (hit) return hit.status
		}
		return 'idle' as const
	})
	const [notice, setNotice] = useState<HistoryNotice>(null)
	const [queues, setQueues] = useState<Record<string, PendingMessage[]>>({})
	const [sendNotice, setSendNotice] = useState<string | null>(null)
	const queuesRef = useRef(queues)
	const holdAuto = useRef(false)
	const flight = useRef<Promise<unknown> | null>(null)
	queuesRef.current = queues
	const busy = isRunBusy(snapshot.runPhase)
	const generating = busy || catalogStatus === 'running'
	const hasMessages = snapshot.messageOrder.length > 0
	const messageCount = snapshot.messageOrder.length
	const lastId = snapshot.messageOrder[messageCount - 1]
	const lastMessage = lastId ? snapshot.messages[lastId] : undefined
	const messageCountRef = useRef(0)
	const springTimer = useRef(0)
	const [sendSpring, setSendSpring] = useState(false)
	const addedUser = lastMessage?.role === 'user' && messageCount === messageCountRef.current + 1
	const [docked, setDocked] = useState(false)
	const shouldDock = hasMessages || (transport.phase === 'loading' && docked)
	if (shouldDock !== docked) setDocked(shouldDock)

	useEffect(() => {
		const previous = messageCountRef.current
		messageCountRef.current = messageCount
		if (lastMessage?.role !== 'user' || messageCount !== previous + 1) return
		setSendSpring(true)
		window.clearTimeout(springTimer.current)
		springTimer.current = window.setTimeout(() => setSendSpring(false), SEND_SCROLL_MS)
	}, [messageCount, lastMessage])

	useEffect(() => {
		return () => window.clearTimeout(springTimer.current)
	}, [])

	useEffect(() => {
		return subscribeOpenSessionEvents((event) => {
			for (const item of adaptAgentSession(event)) runtime.apply(item)
		})
	}, [runtime])

	useEffect(() => {
		const history = transport.phase === 'ready' ? getOpenSessionHistory() : null
		noteModelSession(
			transport.openSessionId,
			history ? { model: history.model, thinkingLevel: history.thinkingLevel } : null,
		)
	}, [transport.openSessionId, transport.phase])

	const sessionId = transport.openSessionId
	const pending = sessionId ? (queues[sessionId] ?? []) : []

	const drop = (id: string, itemId: string) => {
		const next = { ...queuesRef.current, [id]: removePending(queuesRef.current[id] ?? [], itemId) }
		queuesRef.current = next
		setQueues(next)
	}

	const flushHead = async (id: string) => {
		if (holdAuto.current || flight.current) return
		if (getTransportSnapshot().openSessionId !== id) return
		const head = takeHead(queuesRef.current[id] ?? [])?.head
		if (!head) return
		const job = (async () => {
			setSendNotice(null)
			await sendConversation(head.text)
			if (queuesRef.current[id]?.[0]?.id === head.id) drop(id, head.id)
		})()
		flight.current = job
		let sent = false
		try {
			await job
			sent = true
		} catch (error) {
			setSendNotice(error instanceof Error ? error.message : '发送失败')
		} finally {
			if (flight.current === job) flight.current = null
		}
		if (!sent || holdAuto.current || getTransportSnapshot().openSessionId !== id) return
		const busy = catalogRunning(id) || isRunBusy(runtime.getSnapshot().runPhase)
		if (!busy) void flushHead(id)
	}

	const flushHeadRef = useRef(flushHead)
	flushHeadRef.current = flushHead

	useEffect(() => {
		if (holdAuto.current || generating || !sessionId) return
		void flushHeadRef.current(sessionId)
	}, [generating, sessionId])

	const sendNow = async (itemId: string) => {
		if (!sessionId) return
		const item = queuesRef.current[sessionId]?.find((row) => row.id === itemId)
		if (!item) return
		holdAuto.current = true
		setSendNotice(null)
		try {
			await flight.current?.catch(() => undefined)
			const stillQueued = queuesRef.current[sessionId]?.some((row) => row.id === itemId)
			if (stillQueued) {
				if (catalogRunning(sessionId) || isRunBusy(runtime.getSnapshot().runPhase)) await abortConversation()
				await sendConversation(item.text)
				drop(sessionId, item.id)
			}
		} catch (error) {
			setSendNotice(error instanceof Error ? error.message : '发送失败')
		} finally {
			holdAuto.current = false
		}
		const busy = catalogRunning(sessionId) || isRunBusy(runtime.getSnapshot().runPhase)
		if (getTransportSnapshot().openSessionId === sessionId && !busy) void flushHeadRef.current(sessionId)
	}

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
			const draft = transport.openSessionId ? getStreamingDraft(transport.openSessionId) : null
			const painted = draft ? historyToMessages([draft]) : []
			const assistant = painted[0]?.role === 'assistant' ? painted[0] : null
			if (assistant) {
				for (const part of assistant.parts) {
					if (part.type === 'thinking') {
						runtime.apply({
							type: 'thinking_end',
							messageId: assistant.id,
							contentIndex: part.contentIndex,
							content: part.text,
						})
					} else {
						runtime.apply({
							type: 'text_end',
							messageId: assistant.id,
							contentIndex: part.contentIndex,
							content: part.text,
						})
					}
				}
			}
			releaseOpenSession(generation)
			setNotice(null)
		})
		return () => {
			cancelled = true
		}
	}, [runtime, transport.openSessionId, transport.phase])

	return (
		<StickToBottom
			className={classNames('flex min-h-0 flex-1 flex-col', !docked && 'justify-center', className)}
			resize={addedUser || sendSpring ? SEND_SCROLL : 'instant'}
			initial={addedUser || sendSpring ? SEND_SCROLL : 'instant'}
		>
			<ConversationChrome
				snapshot={snapshot}
				notice={notice}
				generating={generating}
				pending={pending}
				sendNotice={sendNotice}
				docked={docked}
				onSendNow={(itemId) => {
					void sendNow(itemId)
				}}
				onRemove={(itemId) => {
					if (!sessionId) return
					drop(sessionId, itemId)
				}}
				accessory={<ModelPicker onError={(message) => setSendNotice(message)} />}
				onSubmit={async (text) => {
					setSendNotice(null)
					if (generating && sessionId) {
						const next = {
							...queuesRef.current,
							[sessionId]: enqueue(queuesRef.current[sessionId] ?? [], {
								id: crypto.randomUUID(),
								text,
							}),
						}
						queuesRef.current = next
						setQueues(next)
						return
					}
					try {
						await sendConversation(text)
					} catch (error) {
						setSendNotice(error instanceof Error ? error.message : '发送失败')
						throw error
					}
				}}
				onAbort={() => {
					setSendNotice(null)
					void abortConversation().catch((error: unknown) => {
						setSendNotice(error instanceof Error ? error.message : '停止失败')
					})
				}}
			/>
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
	generating,
	pending,
	sendNotice,
	docked,
	onSubmit,
	onAbort,
	onSendNow,
	onRemove,
	accessory,
}: {
	snapshot: ConversationSnapshot
	notice: HistoryNotice
	generating: boolean
	pending: readonly PendingMessage[]
	sendNotice: string | null
	docked: boolean
	onSubmit: (text: string) => Promise<void>
	onAbort: () => void
	onSendNow: (id: string) => void
	onRemove: (id: string) => void
	accessory?: ReactNode
}) {
	const { scrollToBottom } = useStickToBottomContext()

	return (
		<>
			{docked ? (
				<div className="relative flex min-h-0 flex-1 flex-col">
					<StickToBottom.Content
						scrollClassName="scrollbar-shallow scrollbar-shallow--static min-h-0 flex-1 [container-type:size]"
						className={COLUMN}
					>
						<HistoryNotice notice={notice} />
						<ConversationView snapshot={snapshot} />
					</StickToBottom.Content>
					<span
						aria-hidden
						className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-[linear-gradient(to_bottom,transparent_0%,var(--app)_100%)]"
					/>
				</div>
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
					generating={generating}
					pending={pending}
					onAbort={onAbort}
					onSendNow={onSendNow}
					onRemove={onRemove}
					accessory={accessory}
					notice={sendNotice}
					placeholder="发送消息…"
					onSubmit={async (text) => {
						void scrollToBottom('instant')
						await onSubmit(text)
					}}
				/>
			</motion.div>
		</>
	)
}
