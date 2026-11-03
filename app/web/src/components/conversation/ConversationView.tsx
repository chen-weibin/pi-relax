import { memo } from 'react'
import classNames from 'classnames'
import type { BlockSnapshot, ConversationSnapshot, MessageSnapshot } from '../../conversation'
import { renderConversationBlock } from './renderBlock'
import { LoadingDots } from '../../ui/LoadingDots'

export type ConversationViewProps = {
	snapshot: ConversationSnapshot
	className?: string
}

const BlockRow = memo(function BlockRow({ block }: { block: BlockSnapshot }) {
	return renderConversationBlock({ block })
})

function MessageArticle({ group, blocks }: { group: MessageSnapshot; blocks: readonly BlockSnapshot[] }) {
	return (
		<article
			className={classNames(
				'flex flex-col gap-2',
				group.role === 'user' && 'sticky top-0 z-10 w-full',
			)}
			data-message-id={group.id}
			data-role={group.role}
		>
			{blocks.map((block) => (
				<BlockRow key={block.key} block={block} />
			))}
		</article>
	)
}

type MessageGroup = { group: MessageSnapshot; blocks: BlockSnapshot[] }

export function ConversationView({ snapshot, className }: ConversationViewProps) {
	const groups: MessageGroup[] = []
	for (const messageId of snapshot.messageOrder) {
		const group = snapshot.messages[messageId]
		if (!group) continue
		const blocks: BlockSnapshot[] = []
		for (const key of group.blockKeys) {
			const block = snapshot.byKey[key]
			if (block) blocks.push(block)
		}
		if (blocks.length === 0) continue
		groups.push({ group, blocks })
	}
	const leading: MessageGroup[] = []
	const turns: MessageGroup[][] = []
	for (const item of groups) {
		if (item.group.role === 'user') {
			turns.push([item])
			continue
		}
		const turn = turns[turns.length - 1]
		if (turn) turn.push(item)
		else leading.push(item)
	}
	const awaiting = snapshot.runPhase === 'awaiting' ? <LoadingDots label="生成中" /> : null

	return (
		<div className={classNames('flex flex-col gap-4 py-3', className)}>
			{leading.map(({ group, blocks }) => (
				<MessageArticle key={group.id} group={group} blocks={blocks} />
			))}
			{turns.map((turn, index) => (
				<div
					key={turn[0]?.group.id}
					className={classNames(
						'flex flex-col gap-4',
						index === turns.length - 1 && 'min-h-[100cqh] pb-[40cqh]',
					)}
				>
					{turn.map(({ group, blocks }) => (
						<MessageArticle key={group.id} group={group} blocks={blocks} />
					))}
					{index === turns.length - 1 ? awaiting : null}
				</div>
			))}
			{turns.length === 0 ? awaiting : null}
		</div>
	)
}
