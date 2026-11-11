import { DefaultTool } from './DefaultTool'
import { toolRenderers } from './registry'
import type { ToolRendererProps } from './types'

/** 工具块的总入口。有专属渲染就用专属的，没有走默认。 */
export function ToolView({ block, expandTick }: ToolRendererProps) {
	const Renderer = toolRenderers[block.data.name]
	if (Renderer) return <Renderer block={block} expandTick={expandTick} />
	return <DefaultTool block={block} expandTick={expandTick} />
}
