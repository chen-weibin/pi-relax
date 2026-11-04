import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import classNames from 'classnames'
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'
import { StickToBottom } from 'use-stick-to-bottom'
import { abortSession, createSession, getSessionHistory, listSessions, promptSession } from '../api/sessions'
import type { SessionRecord } from '../api/sessions/types'
import { parseSessionEvent, subscribeSessionEvents } from '../api/sse'
import { getDefaultWorkspace } from '../api/workspace'
import { adaptAgentSession } from '../conversation/adaptAgentSession'
import { assistantErrorFromEvent } from '../conversation/assistantError'
import { historyAssistantError } from '../conversation/historyMessages'
import { createBlockRuntime, isRunBusy } from '../conversation'
import { translateHistory } from '../conversation/translateHistory'
import { LIST_PAGE_SIZE } from '../session/listPage'
import { AssistantErrorNotice } from '../components/AssistantErrorNotice'
import { Button } from '../ui/Button'
import { ChatView } from './ChatView'
import { PacePanel } from './PacePanel'
import { defaultFeed, type FeedConfig } from './pace'
import { armTape, createTape, parseTapeFile, pushTape, tapeFile, type Tape, type TapeFile, type TapePhase } from './tape'
import '../styles/scrollbar.css'

const COLUMN = 'mx-auto w-full max-w-[800px] px-4'

type HeldRaw = { t: number; data: string }

type SimItem = {
	id: string
	name: string
	file: TapeFile
}

function sessionTitle(row: SessionRecord): string {
	const name = row.name?.trim()
	if (name) return name
	const first = row.firstMessage?.trim()
	if (first) return first
	return row.id
}

function downloadTape(body: unknown) {
	const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = `chat-turn-${Date.now()}.json`
	link.click()
	URL.revokeObjectURL(url)
}

export function ChatLab() {
	const runtimeRef = useRef(createBlockRuntime())
	const runtime = runtimeRef.current
	const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
	const openId = useRef<string | null>(null)
	const phase = useRef<'idle' | 'loading' | 'ready'>('ready')
	const ticket = useRef(0)
	const queue = useRef<AgentSessionEvent[]>([])
	const captured = useRef<{ sessionId: string; event: AgentSessionEvent }[]>([])
	const creating = useRef(false)
	const tapeRef = useRef<Tape>(createTape())
	const tapePhaseRef = useRef<TapePhase>('idle')
	const heldRaw = useRef<HeldRaw[]>([])
	const replaying = useRef(false)
	const replayTimers = useRef<number[]>([])
	const cwdRef = useRef<string | null>(null)
	const runStatusRef = useRef<'idle' | 'running'>('idle')

	const [cwd, setCwd] = useState<string | null>(null)
	const [workspaceName, setWorkspaceName] = useState('')
	const [sessions, setSessions] = useState<SessionRecord[]>([])
	const [total, setTotal] = useState(0)
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [notice, setNotice] = useState<'loading' | 'error' | null>(null)
	const [listError, setListError] = useState<string | null>(null)
	const [sendError, setSendError] = useState<string | null>(null)
	const [assistantError, setAssistantError] = useState<string | null>(null)
	const [draft, setDraft] = useState('')
	const [flight, setFlight] = useState(false)
	const [tapePhase, setTapePhase] = useState<TapePhase>('idle')
	const [replayingUi, setReplayingUi] = useState(false)
	const [runStatus, setRunStatus] = useState<'idle' | 'running'>('idle')
	const [feed, setFeed] = useState<FeedConfig>(defaultFeed)
	const [sims, setSims] = useState<SimItem[]>([])
	const [activeSimId, setActiveSimId] = useState<string | null>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	const generating = isRunBusy(snapshot.runPhase) || runStatus === 'running'

	const setRun = (status: 'idle' | 'running') => {
		runStatusRef.current = status
		setRunStatus(status)
	}

	const rememberTape = (next: Tape) => {
		tapeRef.current = next
		if (next.phase === tapePhaseRef.current) return
		tapePhaseRef.current = next.phase
		setTapePhase(next.phase)
	}

	const flushHeld = (id: string) => {
		let next = tapeRef.current
		for (const item of heldRaw.current) next = pushTape(next, item.data, item.t, id)
		heldRaw.current = []
		rememberTape(next)
	}

	const applyEvent = (event: AgentSessionEvent) => {
		for (const item of adaptAgentSession(event)) runtime.apply(item)
		const next = assistantErrorFromEvent(event)
		if (next !== undefined) setAssistantError(next)
	}

	const cancelReplay = () => {
		for (const id of replayTimers.current) window.clearTimeout(id)
		replayTimers.current = []
		if (!replaying.current) return
		replaying.current = false
		setReplayingUi(false)
	}

	const noteRaw = (data: string) => {
		const now = Date.now()
		const id = openId.current
		const recording = tapeRef.current.phase === 'skip' || tapeRef.current.phase === 'wait' || tapeRef.current.phase === 'capture'
		if (!id) {
			if (recording) heldRaw.current.push({ t: now, data })
			return
		}
		rememberTape(pushTape(tapeRef.current, data, now, id))
	}

	const noteEvent = (sessionIdOfEvent: string, event: AgentSessionEvent) => {
		if (event.type === 'agent_start' || event.type === 'agent_settled') {
			const status = event.type === 'agent_start' ? 'running' : 'idle'
			setSessions((rows) => rows.map((row) => (row.id === sessionIdOfEvent ? { ...row, status } : row)))
			if (sessionIdOfEvent === openId.current) setRun(status)
		}
		if (replaying.current) return
		if (creating.current) {
			captured.current.push({ sessionId: sessionIdOfEvent, event })
			return
		}
		if (sessionIdOfEvent !== openId.current) return
		if (phase.current !== 'ready') {
			queue.current.push(event)
			return
		}
		applyEvent(event)
	}

	useEffect(() => {
		const controller = new AbortController()
		void subscribeSessionEvents({
			signal: controller.signal,
			onOpen() {},
			onReconnecting() {},
			onRaw: noteRaw,
			onEvent: noteEvent,
		}).catch(() => {
			if (!controller.signal.aborted) setListError('事件连接中断')
		})
		return () => {
			controller.abort()
			cancelReplay()
		}
		// 连接保持到页面卸载。回调读的是 ref。
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const reload = async (target: string) => {
		const page = await listSessions(target, 0, LIST_PAGE_SIZE)
		setSessions(page.sessions)
		setTotal(page.total)
	}

	useEffect(() => {
		let cancel = false
		void (async () => {
			try {
				const workspace = await getDefaultWorkspace()
				if (cancel) return
				cwdRef.current = workspace.cwd
				setCwd(workspace.cwd)
				setWorkspaceName(workspace.name)
				const page = await listSessions(workspace.cwd, 0, LIST_PAGE_SIZE)
				if (cancel) return
				setSessions(page.sessions)
				setTotal(page.total)
			} catch (error) {
				if (!cancel) setListError(error instanceof Error ? error.message : '会话加载失败')
			}
		})()
		return () => {
			cancel = true
		}
	}, [])

	const openSession = async (id: string) => {
		cancelReplay()
		const ticketNo = ++ticket.current
		openId.current = id
		phase.current = 'loading'
		const preload = captured.current.filter((item) => item.sessionId === id).map((item) => item.event)
		captured.current = []
		creating.current = false
		queue.current = []
		flushHeld(id)
		setSessionId(id)
		setActiveSimId(null)
		setNotice('loading')
		setSendError(null)
		setAssistantError(null)
		runtime.replace([])
		const row = sessions.find((item) => item.id === id)
		setRun(row?.status === 'running' ? 'running' : 'idle')
		try {
			const history = await getSessionHistory(id)
			if (ticket.current !== ticketNo) return
			const messages = await translateHistory(history.messages, ticketNo, () => ticket.current)
			if (!messages) return
			runtime.replace(messages)
			setAssistantError(historyAssistantError(history.messages))
			const rest = queue.current.splice(0)
			phase.current = 'ready'
			for (const event of [...preload, ...rest]) applyEvent(event)
			setNotice(null)
		} catch (error) {
			if (ticket.current !== ticketNo) return
			phase.current = 'idle'
			setNotice('error')
			setSendError(error instanceof Error ? error.message : '历史加载失败')
		}
	}

	const startDraft = () => {
		cancelReplay()
		ticket.current += 1
		openId.current = null
		phase.current = 'ready'
		queue.current = []
		captured.current = []
		creating.current = false
		setSessionId(null)
		setActiveSimId(null)
		setNotice(null)
		setSendError(null)
		setAssistantError(null)
		setRun('idle')
		runtime.replace([])
	}

	const send = async () => {
		const text = draft.trim()
		const target = cwdRef.current
		const busy = isRunBusy(runtime.getSnapshot().runPhase) || runStatusRef.current === 'running'
		if (!text || !target || flight || replaying.current || busy) return
		setDraft('')
		setSendError(null)
		setAssistantError(null)
		setFlight(true)
		try {
			const current = openId.current
			if (!current) {
				creating.current = true
				captured.current = []
				const record = await createSession(text, target)
				await reload(target)
				await openSession(record.id)
				return
			}
			const record = await promptSession(current, text)
			setRun(record.status === 'running' ? 'running' : 'idle')
		} catch (error) {
			creating.current = false
			setDraft(text)
			setSendError(error instanceof Error ? error.message : '发送失败')
		} finally {
			setFlight(false)
		}
	}

	const stop = () => {
		const id = openId.current
		if (!id) return
		setSendError(null)
		void abortSession(id).catch((error: unknown) => {
			setSendError(error instanceof Error ? error.message : '停止失败')
		})
	}

	const arm = () => {
		if (replaying.current) return
		heldRaw.current = []
		const busy = isRunBusy(runtime.getSnapshot().runPhase) || runStatusRef.current === 'running'
		rememberTape(armTape(busy))
	}

	const exportTurn = () => {
		if (tapeRef.current.phase !== 'done') return
		const file = tapeFile(tapeRef.current.frames)
		if (!file) return
		downloadTape(file)
	}

	const rememberSim = (name: string, file: TapeFile): string => {
		let id = ''
		setSims((rows) => {
			const hit = rows.find((row) => row.name === name)
			if (hit) {
				id = hit.id
				return rows.map((row) => (row.id === hit.id ? { ...row, file } : row))
			}
			id = crypto.randomUUID()
			return [{ id, name, file }, ...rows]
		})
		return id
	}

	const replay = (file: TapeFile, simId: string) => {
		cancelReplay()
		ticket.current += 1
		replaying.current = true
		setReplayingUi(true)
		openId.current = null
		phase.current = 'ready'
		queue.current = []
		setSessionId(null)
		setActiveSimId(simId)
		setNotice(null)
		setSendError(null)
		setAssistantError(null)
		setRun('idle')
		runtime.replace([])
		const timers = file.frames.map((frame) =>
			window.setTimeout(() => {
				if (!replaying.current) return
				const parsed = parseSessionEvent(frame.data)
				if (!parsed) return
				applyEvent(parsed.event)
			}, frame.offsetMs),
		)
		const last = file.frames[file.frames.length - 1]?.offsetMs ?? 0
		timers.push(
			window.setTimeout(() => {
				replaying.current = false
				setReplayingUi(false)
			}, last),
		)
		replayTimers.current = timers
	}

	const loadMore = () => {
		const target = cwdRef.current
		if (!target || sessions.length >= total) return
		void listSessions(target, sessions.length, LIST_PAGE_SIZE)
			.then((page) => {
				setSessions((rows) => [...rows, ...page.sessions])
				setTotal(page.total)
			})
			.catch((error: unknown) => {
				setListError(error instanceof Error ? error.message : '会话加载失败')
			})
	}

	const recordLabel = tapePhase === 'capture' ? '录制中' : tapePhase === 'skip' || tapePhase === 'wait' ? '等待下一轮' : '录制'

	return (
		<div className="flex h-screen w-screen bg-app text-fg">
			<aside className="flex w-[220px] shrink-0 flex-col border-r border-border">
				<div className="px-3 py-3">
					<p className="truncate text-sm text-fg">{workspaceName || '工作区'}</p>
					<p className="truncate text-xs text-fg-3">{cwd ?? ''}</p>
				</div>
				<nav className="scrollbar-shallow min-h-0 flex-1 overflow-y-auto px-2 pb-3">
					{sims.length > 0 ? (
						<div className="mb-2">
							<p className="px-2 py-1 text-xs text-fg-3">模拟</p>
							{sims.map((sim) => (
								<button
									key={sim.id}
									type="button"
									className={classNames(
										'block w-full truncate rounded px-2 py-1.5 text-left text-sm',
										sim.id === activeSimId ? 'bg-surface-active text-fg' : 'text-fg-2 hover:bg-surface-hover',
									)}
									onClick={() => replay(sim.file, sim.id)}
								>
									{sim.name}
								</button>
							))}
						</div>
					) : null}
					{sessions.map((row) => (
						<button
							key={row.id}
							type="button"
							className={classNames(
								'block w-full truncate rounded px-2 py-1.5 text-left text-sm',
								row.id === sessionId ? 'bg-surface-active text-fg' : 'text-fg-2 hover:bg-surface-hover',
							)}
							onClick={() => {
								void openSession(row.id)
							}}
						>
							{sessionTitle(row)}
						</button>
					))}
					{sessions.length === 0 ? <p className="px-2 py-2 text-sm text-fg-3">暂无会话</p> : null}
					{sessions.length < total ? (
						<Button size="sm" variant="ghost" className="mt-1" onClick={loadMore}>
							更多
						</Button>
					) : null}
					{listError ? <p className="px-2 py-2 text-sm text-fg-3">{listError}</p> : null}
				</nav>
			</aside>
			<main className="flex min-w-0 flex-1 flex-col">
				<div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
					<Button size="sm" variant="outline" className="shrink-0" onClick={startDraft}>
						新建
					</Button>
					<Button size="sm" variant={tapePhase === 'idle' || tapePhase === 'done' ? 'outline' : 'solid'} className="shrink-0" onClick={arm} disabled={replayingUi}>
						{recordLabel}
					</Button>
					<Button size="sm" variant="outline" className="shrink-0" onClick={exportTurn} disabled={tapePhase !== 'done'}>
						导出
					</Button>
					<Button size="sm" variant="outline" className="shrink-0" onClick={() => fileRef.current?.click()}>
						模拟
					</Button>
					<input
						ref={fileRef}
						type="file"
						accept="application/json"
						className="hidden"
						onChange={(event) => {
							const file = event.target.files?.[0]
							event.target.value = ''
							if (!file) return
							void file.text().then((text) => {
								try {
									const parsed = parseTapeFile(JSON.parse(text) as unknown)
									if (!parsed) {
										setSendError('这个 JSON 不是一轮会话记录')
										return
									}
									const name = file.name.replace(/\.json$/i, '') || '模拟'
									replay(parsed, rememberSim(name, parsed))
								} catch {
									setSendError('这个 JSON 不是一轮会话记录')
								}
							})
						}}
					/>
					{replayingUi ? <span className="text-sm text-fg-3">模拟回放</span> : null}
				</div>
				<StickToBottom className="flex min-h-0 flex-1 flex-col" resize="instant" initial="instant">
					<div className="relative flex min-h-0 flex-1 flex-col">
						<StickToBottom.Content
							scrollClassName="scrollbar-shallow scrollbar-shallow--static min-h-0 flex-1 [container-type:size]"
							className={COLUMN}
						>
							{notice === 'loading' ? <p className="py-3 text-center text-sm text-fg-3">加载中...</p> : null}
							{notice === 'error' ? <p className="py-3 text-sm text-fg-3">历史加载失败</p> : null}
							<ChatView snapshot={snapshot} feed={feed} />
						</StickToBottom.Content>
						<span
							aria-hidden
							className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-[linear-gradient(to_bottom,transparent_0%,var(--app)_100%)]"
						/>
					</div>
					<form
						className={classNames(COLUMN, 'mb-4 flex shrink-0 gap-2')}
						onSubmit={(event) => {
							event.preventDefault()
							void send()
						}}
					>
						<AssistantErrorNotice
							className="min-w-0 flex-1"
							message={assistantError}
							onDismiss={() => setAssistantError(null)}
						>
							<input
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								placeholder="发送消息…"
								disabled={replayingUi}
								className="h-[30px] w-full rounded-md border border-border bg-surface px-2.5 text-md text-fg outline-none placeholder:text-fg-3"
							/>
						</AssistantErrorNotice>
						{generating && !replayingUi ? (
							<Button type="button" variant="outline" onClick={stop}>
								停止
							</Button>
						) : (
							<Button type="submit" disabled={flight || replayingUi || !draft.trim()}>
								发送
							</Button>
						)}
					</form>
					{sendError ? <p className={classNames(COLUMN, 'pb-3 text-sm text-fg-3')}>{sendError}</p> : null}
				</StickToBottom>
			</main>
			<PacePanel feed={feed} onChange={setFeed} />
		</div>
	)
}
