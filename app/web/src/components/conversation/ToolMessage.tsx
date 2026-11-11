import type { ToolBlock } from '../../conversation'
import { ToolView } from './tools'

export type ToolMessageProps = {
	block: ToolBlock
	expandTick?: number
}

export function ToolMessage({ block, expandTick = 0 }: ToolMessageProps) {
	return <ToolView block={block} expandTick={expandTick} />
}
