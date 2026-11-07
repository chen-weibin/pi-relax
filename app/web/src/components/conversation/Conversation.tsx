import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import classNames from 'classnames'
import { motion } from 'motion/react'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { historyAssistantError, historyToMessages } from '../../conversation/historyMessages'
import { translateHistory } from '../../conversation/translateHistory'
import { createBlockRuntime, isRunBusy, type ConversationSnapshot } from '../../conversation'
import {
	abortConversation,
	getOpenSessionHistory,
	getStreamingDraft,
	getTransportGeneration,
	getTransportSnapshot,
	promptConversation,
	releaseOpenSession,
	sendConversation,
	subscribeOpenSessionEvents,
	subscribeTransport,
} from '../../session'
import { noteModelSession } from '../../session/modelPicker'
import { enqueue, removePending, takeHead, type PendingMessage } from '../../session/pendingQueue'
import { useCatalogStore } from '../../store'
import { Composer } from '../Composer'
import { AssistantErrorNotice } from '../AssistantErrorNotice'
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

function sessionStatuses(pages: Record<string, { sessions: { id: string; status: string }[] }>): Record<string, string> {
	const status: Record<string, string> = {}
	for (const page of Object.values(pages)) {
		for (const session of page.sessions) status[session.id] = session.status
	}
	return status
}

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
	const [assistantError, setAssistantError] = useState<string | null>(null)
	const queuesRef = useRef(queues)
	const holdAuto = useRef(false)
	const flight = useRef<Record<string, Promise<unknown>>>({})
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
		return subscribeOpenSessionEvents((frame) => {
			for (const item of frame.blocks) runtime.apply(item)
			if (frame.assistantError !== undefined) setAssistantError(frame.assistantError)
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
		if (flight.current[id]) return
		const watching = getTransportSnapshot().openSessionId === id
		if (holdAuto.current && watching) return
		const head = takeHead(queuesRef.current[id] ?? [])?.head
		if (!head) return
		const job = (async () => {
			const watching = getTransportSnapshot().openSessionId === id
			if (watching) setSendNotice(null)
			await promptConversation(id, head.text, watching)
			if (queuesRef.current[id]?.[0]?.id === head.id) drop(id, head.id)
		})()
		flight.current[id] = job
		let sent = false
		try {
			await job
			sent = true
		} catch (error) {
			if (getTransportSnapshot().openSessionId === id) {
				setSendNotice(error instanceof Error ? error.message : '发送失败')
			}
		} finally {
			if (flight.current[id] === job) delete flight.current[id]
		}
		if (!sent || (holdAuto.current && getTransportSnapshot().openSessionId === id)) return
		const open = getTransportSnapshot().openSessionId === id
		const busy = catalogRunning(id) || (open && isRunBusy(runtime.getSnapshot().runPhase))
		if (!busy) void flushHead(id)
	}

	const flushHeadRef = useRef(flushHead)
	flushHeadRef.current = flushHead

	useEffect(() => {
		if (holdAuto.current || generating || !sessionId) return
		void flushHeadRef.current(sessionId)
	}, [generating, sessionId])

	useEffect(() => {
		let status = sessionStatuses(useCatalogStore.getState().sessionPages)
		return useCatalogStore.subscribe((state) => {
			const next = sessionStatuses(state.sessionPages)
			for (const [id, value] of Object.entries(next)) {
				if (status[id] === 'running' && value !== 'running') void flushHeadRef.current(id)
			}
			status = next
		})
	}, [])

	const sendNow = async (itemId: string) => {
		if (!sessionId) return
		const item = queuesRef.current[sessionId]?.find((row) => row.id === itemId)
		if (!item) return
		holdAuto.current = true
		setSendNotice(null)
		try {
			await flight.current[sessionId]?.catch(() => undefined)
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
			setAssistantError(null)
			setNotice('error')
			return
		}
		if (transport.phase !== 'ready') {
			runtime.replace([])
			setAssistantError(null)
			setNotice(transport.phase === 'loading' ? 'loading' : null)
			return
		}
		const generation = getTransportGeneration()
		const history = getOpenSessionHistory()
		if (!history) {
			runtime.replace([])
			setAssistantError(null)
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
					} else if (part.type === 'tool') {
						runtime.apply({
							type: 'tool_end',
							messageId: assistant.id,
							contentIndex: part.contentIndex,
							toolCallId: part.id,
							name: part.name,
							argumentsText: part.argumentsText,
							settled: true,
						})
						if (part.resultText !== '' || part.isError) {
							runtime.apply({
								type: 'tool_result',
								toolCallId: part.id,
								name: part.name,
								resultText: part.resultText,
								isError: part.isError,
								done: true,
							})
						}
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
			setAssistantError(historyAssistantError(history.messages))
			releaseOpenSession(generation)
			const openId = transport.openSessionId
			if (openId && catalogRunning(openId) && !isRunBusy(runtime.getSnapshot().runPhase)) runtime.resumeLive()
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
				assistantError={assistantError}
				onDismissAssistantError={() => setAssistantError(null)}
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
					setAssistantError(null)
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
	assistantError,
	onDismissAssistantError,
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
	assistantError: string | null
	onDismissAssistantError: () => void
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
				<AssistantErrorNotice message={assistantError} onDismiss={onDismissAssistantError}>
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
				</AssistantErrorNotice>
			</motion.div>
		</>
	)
}
