import { memo, useRef, useState, type ReactNode, type Ref } from 'react'
import classNames from 'classnames'
import type { BlockSnapshot, ConversationSnapshot } from '../../conversation'
import { isRunBusy } from '../../conversation'
import { layoutTurns, showAwaiting, type Segment, type TurnLayout } from '../../conversation/explore'
import { activityForTail, chromeForExplore, PLANNING_LABEL } from '../../conversation/exploreChrome'
import { ActivityLine } from './ActivityLine'
import { ExploreGroup, type ExploreGroupHandle } from './ExploreGroup'
import { renderConversationBlock } from './renderBlock'

export type ConversationViewProps = {
	snapshot: ConversationSnapshot
	className?: string
}

const BlockRow = memo(function BlockRow({ block, expandTick = 0 }: { block: BlockSnapshot; expandTick?: number }) {
	return renderConversationBlock({ block, expandTick })
})

function ExploreSegment({
	blocks,
	live,
	groupRef,
	focusKey,
	focusTick,
	onGroupOpenChange,
}: {
	blocks: readonly BlockSnapshot[]
	live: boolean
	groupRef?: Ref<ExploreGroupHandle>
	focusKey: string | null
	focusTick: number
	onGroupOpenChange?: (open: boolean) => void
}) {
	const chrome = chromeForExplore(blocks, live)
	if (chrome.mode === 'single') return <BlockRow block={chrome.block} />
	if (chrome.mode !== 'group') return null
	return (
		<ExploreGroup ref={groupRef} trail={chrome.trail} onOpenChange={onGroupOpenChange}>
			{blocks.map((block) => (
				<div key={block.key} data-block-key={block.key}>
					<BlockRow block={block} expandTick={focusKey === block.key ? focusTick : 0} />
				</div>
			))}
		</ExploreGroup>
	)
}

function Segments({
	segments,
	liveTail,
	groupRef,
	focusKey,
	focusTick,
	onGroupOpenChange,
	activity,
}: {
	segments: readonly Segment[]
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
						<BlockRow key={block.key} block={block} />
					))}
				</article>
			)
		} else if (segment.type === 'explore') {
			node = (
				<ExploreSegment
					key={segment.id}
					blocks={segment.blocks}
					live={tail}
					groupRef={tail ? groupRef : undefined}
					focusKey={focusKey}
					focusTick={focusTick}
					onGroupOpenChange={tail ? onGroupOpenChange : undefined}
				/>
			)
		} else {
			node = <BlockRow key={segment.id} block={segment.block} />
		}
		if (!last) return node
		return (
			<div key={segment.id} className={classNames('flex flex-col gap-2.5', segment.type === 'user' && 'sticky top-0 z-10')}>
				{node}
				{activity}
			</div>
		)
	})
}

function Turn({ turn, last, busy, awaiting }: { turn: TurnLayout; last: boolean; busy: boolean; awaiting: boolean }) {
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

export function ConversationView({ snapshot, className }: ConversationViewProps) {
	const laid = layoutTurns(snapshot)
	const busy = isRunBusy(snapshot.runPhase)
	const awaiting = showAwaiting(snapshot)
	const last = laid.turns.length - 1

	return (
		<div className={classNames('flex flex-col gap-5 py-3', className)}>
			{laid.leading.length > 0 ? (
				<div className="flex flex-col gap-2.5">
					<Segments segments={laid.leading} liveTail={false} focusKey={null} focusTick={0} />
				</div>
			) : null}
			{laid.turns.map((turn, index) => (
				<Turn key={turn.id} turn={turn} last={index === last} busy={busy} awaiting={index === last && awaiting} />
			))}
			{laid.turns.length === 0 && awaiting ? <ActivityLine label={PLANNING_LABEL} /> : null}
		</div>
	)
}
