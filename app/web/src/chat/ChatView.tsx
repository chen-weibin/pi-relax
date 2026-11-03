import { memo, useRef, useState } from 'react'
import classNames from 'classnames'
import type { BlockSnapshot, ConversationSnapshot, MessageSnapshot, TextBlock, ThinkingBlock, UserTextBlock } from '../conversation'
import { DisclosureRow } from '../ui/DisclosureRow'
import { LoadingDots } from '../ui/LoadingDots'
import { MessageSurface } from '../ui/MessageSurface'
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
		<div className="flex justify-end">
			<MessageSurface className="max-w-full min-w-[320px]">
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

function ThinkingRow({ block, feed }: { block: ThinkingBlock; feed: FeedConfig }) {
	const streaming = block.contentPhase === 'open'
	const text = useStreamText(block.data.text, streaming, feed)
	const live = useLived(streaming)
	const [open, setOpen] = useState(false)
	return (
		<DisclosureRow title={streaming ? '思考中' : '思考'} open={open} blinking={streaming} chevron="hover" onOpenChange={setOpen}>
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

const BlockRow = memo(function BlockRow({ block, feed }: { block: BlockSnapshot; feed: FeedConfig }) {
	if (block.kind === 'user-text') return <UserRow block={block} />
	if (block.kind === 'thinking') return <ThinkingRow block={block} feed={feed} />
	if (block.kind === 'text') return <AssistantRow block={block} feed={feed} />
	return null
})

type MessageGroup = { group: MessageSnapshot; blocks: BlockSnapshot[] }

export function ChatView({ snapshot, feed }: { snapshot: ConversationSnapshot; feed: FeedConfig }) {
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
		<div className="flex flex-col gap-4 py-3">
			{leading.map(({ group, blocks }) => (
				<article key={group.id} className="flex flex-col gap-2" data-message-id={group.id} data-role={group.role}>
					{blocks.map((block) => (
						<BlockRow key={block.key} block={block} feed={feed} />
					))}
				</article>
			))}
			{turns.map((turn, index) => (
				<div
					key={turn[0]?.group.id}
					className={classNames('flex flex-col gap-4', index === turns.length - 1 && 'min-h-[100cqh] pb-[40cqh]')}
				>
					{turn.map(({ group, blocks }) => (
						<article
							key={group.id}
							className={classNames(
								'flex flex-col gap-2',
								group.role === 'user' && 'sticky top-0 z-10 w-fit max-w-full self-end',
							)}
							data-message-id={group.id}
							data-role={group.role}
						>
							{blocks.map((block) => (
								<BlockRow key={block.key} block={block} feed={feed} />
							))}
						</article>
					))}
					{index === turns.length - 1 ? awaiting : null}
				</div>
			))}
			{turns.length === 0 ? awaiting : null}
		</div>
	)
}
