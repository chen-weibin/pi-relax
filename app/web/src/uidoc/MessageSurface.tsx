import { MessageSurface } from '../ui/MessageSurface'
import { Preview } from './frame'

function MessageSurfaceDemo() {
	return (
		<Preview label="卡片">
			<MessageSurface>
				<p>一段放在卡片里的文字。</p>
			</MessageSurface>
		</Preview>
	)
}

export const messageSurfaceDoc = {
	id: 'message-surface',
	heading: 'MessageSurface',
	description: '没有角色语义的轻量卡片，只包住里面的内容。',
	nav: ['MessageSurface'],
	Demo: MessageSurfaceDemo,
}
