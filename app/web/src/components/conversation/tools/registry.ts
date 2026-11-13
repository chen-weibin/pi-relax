import type { ComponentType } from 'react'
import { FileChangeTool } from './fileChange/FileChangeTool'
import { LsTool } from './ls/LsTool'
import { ReadTool } from './read/ReadTool'
import { ShellTool } from './shell/ShellTool'
import type { ToolRendererProps } from './types'

/**
 * 工具名 → 专属渲染。
 *
 * 没登记的工具走 `DefaultTool`。加一个新工具专属渲染：写 `tools/<name>/<Name>Tool.tsx`，在这里加一行。
 */
export const toolRenderers: Record<string, ComponentType<ToolRendererProps>> = {
	bash: ShellTool,
	powershell: ShellTool,
	ls: LsTool,
	read: ReadTool,
	write: FileChangeTool,
	edit: FileChangeTool,
}
