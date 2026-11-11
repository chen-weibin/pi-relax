import type { ComponentType } from 'react'
import { BashTool } from './bash/BashTool'
import type { ToolRendererProps } from './types'

/**
 * 工具名 → 专属渲染。
 *
 * 没登记的工具走 `DefaultTool`。加一个新工具专属渲染：写 `tools/<name>/<Name>Tool.tsx`，在这里加一行。
 */
export const toolRenderers: Record<string, ComponentType<ToolRendererProps>> = {
	bash: BashTool,
}
