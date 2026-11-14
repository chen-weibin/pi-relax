import { DefaultTool } from './DefaultTool'
import { toolRenderers } from './registry'
import type { ToolRendererProps } from './types'

/** 按工具名画一行。嵌套的 codemode 不再套一层编排。 */
export function renderNamedTool({ block, expandTick }: ToolRendererProps) {
	const Renderer = block.data.name === 'codemode' ? DefaultTool : (toolRenderers[block.data.name] ?? DefaultTool)
	return <Renderer block={block} expandTick={expandTick} />
}
