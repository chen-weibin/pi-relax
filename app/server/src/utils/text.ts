/** 从一条消息的 content 抽出纯文本。 */
export function messageText(message: { role?: string; content?: unknown }): string {
	const content = message.content
	if (typeof content === 'string') return content
	if (!Array.isArray(content)) return ''
	return content
		.filter((block): block is { type: string; text?: string } => block?.type === 'text')
		.map((block) => block.text ?? '')
		.join('')
}
