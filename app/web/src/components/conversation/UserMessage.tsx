import { MarkdownView } from '../../ui/MarkdownView'
import { MessageSurface } from '../../ui/MessageSurface'
import type { UserTextBlock } from '../../conversation'

export type UserMessageProps = {
	block: UserTextBlock
}

export function UserMessage({ block }: UserMessageProps) {
	return (
		<div className="flex justify-end">
			<MessageSurface className="max-w-[min(100%,36rem)]">
				<MarkdownView text={block.data.text} mode="static" />
			</MessageSurface>
		</div>
	)
}
