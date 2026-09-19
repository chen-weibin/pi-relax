import { memo } from 'react'
import classNames from 'classnames'
import type { BlockSnapshot, ConversationSnapshot } from '../../conversation'
import { renderConversationBlock } from './renderBlock'
import { LoadingDots } from '../../ui/LoadingDots'

export type ConversationViewProps = {
	snapshot: ConversationSnapshot
	className?: string
}

const BlockRow = memo(function BlockRow({ block }: { block: BlockSnapshot }) {
	return renderConversationBlock({ block })
})

export function ConversationView({ snapshot, className }: ConversationViewProps) {
	return (
		<div className={classNames('flex flex-col gap-4 py-3', className)}>
			{snapshot.messageOrder.map((messageId) => {
				const group = snapshot.messages[messageId]
				if (!group) return null
				return (
					<article
						key={messageId}
						className="flex flex-col gap-2"
						data-message-id={messageId}
						data-role={group.role}
					>
						{group.blockKeys.map((key) => {
							const block = snapshot.byKey[key]
							if (!block) return null
							return <BlockRow key={key} block={block} />
						})}
					</article>
				)
			})}
			{snapshot.runPhase === 'awaiting' ? (
				<LoadingDots label="生成中" />
			) : null}
		</div>
	)
}
