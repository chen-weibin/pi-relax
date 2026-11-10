import { memo, useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import classNames from 'classnames'
import type { BlockSnapshot, ConversationSnapshot, TextBlock, ThinkingBlock, ToolBlock, UserTextBlock } from '../conversation'
import { isRunBusy } from '../conversation'
import { layoutTurns, showAwaiting, type Segment, type TurnLayout } from '../conversation/explore'
import { DisclosureRow } from '../ui/DisclosureRow'
import { MessageSurface } from '../ui/MessageSurface'
import { ActivityLine } from '../components/conversation/ActivityLine'
import { ExploreGroup, type ExploreGroupHandle } from '../components/conversation/ExploreGroup'
import { activityForTail, chromeForExplore, PLANNING_LABEL } from '../conversation/exploreChrome'
import { ChatMarkdown } from './ChatMarkdown'
import type { FeedConfig } from './pace'
import { useStreamText } from './useStreamText'

function useLived(streaming: boolean): boolean {
	const lived = useRef(false)
	if (streaming) lived.current = true
	return lived.current
}

function UserRow({ block }: { block: UserTextBlock }) {
	return (
		<div className="flex w-full justify-end">
			<MessageSurface className="w-full">
				<ChatMarkdown text={block.data.text} live={false} streaming={false} />
			</MessageSurface>
		</div>
	)
}

function AssistantRow({ block, feed }: { block: TextBlock; feed: FeedConfig }) {
	const streaming = block.contentPhase === 'open'
	const text = useStreamText(block.data.text, streaming, feed)
	const live = useLived(streaming)
	return <ChatMarkdown text={text} live={live} streaming={streaming} isAnimating={streaming} />
}

function ThinkingRow({ block, feed, expandTick = 0 }: { block: ThinkingBlock; feed: FeedConfig; expandTick?: number }) {
	const streaming = block.contentPhase === 'open'
	const text = useStreamText(block.data.text, streaming, feed)
	const live = useLived(streaming)
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])
	return (
		<DisclosureRow title="思考" open={open} blinking={streaming} chevron="hover" onOpenChange={setOpen}>
			<ChatMarkdown
				text={text}
				live={live}
				streaming={streaming}
				isAnimating={open && streaming}
				className="markdown-view--dim"
			/>
		</DisclosureRow>
	)
}

function ToolRow({ block, expandTick = 0 }: { block: ToolBlock; expandTick?: number }) {
	const streaming = block.contentPhase === 'open'
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (expandTick > 0) setOpen(true)
	}, [expandTick])
	const { name, argumentsText, resultText, isError } = block.data
	return (
		<DisclosureRow title={name || '工具'} open={open} blinking={streaming} chevron="hover" onOpenChange={setOpen}>
			{argumentsText ? <pre className="whitespace-pre-wrap text-sm text-fg-3">{argumentsText}</pre> : null}
			{resultText ? (
				isError ? (
					<p className="whitespace-pre-wrap text-sm text-error">{resultText}</p>
				) : (
					<ChatMarkdown text={resultText} live={false} streaming={false} />
				)
			) : null}
		</DisclosureRow>
	)
}

const BlockRow = memo(function BlockRow({
	block,
	feed,
	expandTick = 0,
}: {
	block: BlockSnapshot
	feed: FeedConfig
	expandTick?: number
}) {
	if (block.kind === 'user-text') return <UserRow block={block} />
	if (block.kind === 'thinking') return <ThinkingRow block={block} feed={feed} expandTick={expandTick} />
	if (block.kind === 'text') return <AssistantRow block={block} feed={feed} />
	return <ToolRow block={block} expandTick={expandTick} />
})

function ExploreSegment({
	blocks,
	feed,
	live,
	groupRef,
	focusKey,
	focusTick,
	onGroupOpenChange,
}: {
	blocks: readonly BlockSnapshot[]
	feed: FeedConfig
	live: boolean
	groupRef?: Ref<ExploreGroupHandle>
	focusKey: string | null
	focusTick: number
	onGroupOpenChange?: (open: boolean) => void
}) {
	const chrome = chromeForExplore(blocks, live)
	if (chrome.mode === 'single') return <BlockRow block={chrome.block} feed={feed} />
	if (chrome.mode !== 'group') return null
	return (
		<ExploreGroup ref={groupRef} trail={chrome.trail} onOpenChange={onGroupOpenChange}>
			{blocks.map((block) => (
				<div key={block.key} data-block-key={block.key}>
					<BlockRow block={block} feed={feed} expandTick={focusKey === block.key ? focusTick : 0} />
				</div>
			))}
		</ExploreGroup>
	)
}

function Segments({
	segments,
	feed,
	liveTail,
	groupRef,
	focusKey,
	focusTick,
	onGroupOpenChange,
	activity,
}: {
	segments: readonly Segment[]
	feed: FeedConfig
	liveTail: boolean
	groupRef?: Ref<ExploreGroupHandle>
	focusKey: string | null
	focusTick: number
	onGroupOpenChange?: (open: boolean) => void
	activity?: ReactNode
}) {
	return segments.map((segment, index) => {
		const tail = liveTail && index === segments.length - 1
		const last = index === segments.length - 1
		let node: ReactNode
		if (segment.type === 'user') {
			node = (
				<article
					key={segment.id}
					className={classNames('sticky top-0 z-10 flex w-full flex-col gap-2', !last && 'mb-2.5')}
					data-message-id={segment.id}
					data-role="user"
				>
					{segment.blocks.map((block) => (
						<BlockRow key={block.key} block={block} feed={feed} />
					))}
				</article>
			)
		} else if (segment.type === 'explore') {
			node = (
				<ExploreSegment
					key={segment.id}
					blocks={segment.blocks}
					feed={feed}
					live={tail}
					groupRef={tail ? groupRef : undefined}
					focusKey={focusKey}
					focusTick={focusTick}
					onGroupOpenChange={tail ? onGroupOpenChange : undefined}
				/>
			)
		} else {
			node = <BlockRow key={segment.id} block={segment.block} feed={feed} />
		}
		if (!last) return node
		return (
			<div
				key={segment.id}
				className={classNames('flex flex-col gap-2.5', segment.type === 'user' && 'sticky top-0 z-10')}
			>
				{node}
				{activity}
			</div>
		)
	})
}

function Turn({
	turn,
	feed,
	last,
	busy,
	awaiting,
}: {
	turn: TurnLayout
	feed: FeedConfig
	last: boolean
	busy: boolean
	awaiting: boolean
}) {
	const groupRef = useRef<ExploreGroupHandle>(null)
	const [focusKey, setFocusKey] = useState<string | null>(null)
	const [focusTick, setFocusTick] = useState(0)
	const [groupOpen, setGroupOpen] = useState(false)
	const live = last && busy
	const activity = activityForTail(turn.segments, live, awaiting)
	const showActivity = activity != null && !(groupOpen && activity.focusKey)
	return (
		<div className={classNames('flex flex-col gap-2.5', last && 'min-h-[100cqh] pb-[40cqh]')}>
			<Segments
				segments={turn.segments}
				feed={feed}
				liveTail={live}
				groupRef={groupRef}
				focusKey={focusKey}
				focusTick={focusTick}
				onGroupOpenChange={setGroupOpen}
				activity={
					showActivity && activity ? (
						<ActivityLine
							label={activity.label}
							onLocate={
								activity.focusKey
									? () => {
											const key = activity.focusKey
											if (!key) return
											setFocusKey(key)
											setFocusTick((tick) => tick + 1)
											groupRef.current?.reveal(key)
										}
									: undefined
							}
						/>
					) : null
				}
			/>
		</div>
	)
}

export function ChatView({ snapshot, feed }: { snapshot: ConversationSnapshot; feed: FeedConfig }) {
	const laid = layoutTurns(snapshot)
	const busy = isRunBusy(snapshot.runPhase)
	const awaiting = showAwaiting(snapshot)
	const last = laid.turns.length - 1

	return (
		<div className="flex flex-col gap-5 py-3">
			{laid.leading.length > 0 ? (
				<div className="flex flex-col gap-2.5">
					<Segments segments={laid.leading} feed={feed} liveTail={false} focusKey={null} focusTick={0} />
				</div>
			) : null}
			{laid.turns.map((turn, index) => (
				<Turn key={turn.id} turn={turn} feed={feed} last={index === last} busy={busy} awaiting={index === last && awaiting} />
			))}
			{laid.turns.length === 0 && awaiting ? <ActivityLine label={PLANNING_LABEL} /> : null}
		</div>
	)
}
