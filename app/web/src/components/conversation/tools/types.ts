import type { ToolBlock } from '../../../conversation'

/** 工具专属渲染拿到的全部东西。 */
export type ToolRendererProps = {
	block: ToolBlock
	/** 活动行点「定位」时自增。>0 表示要展开。 */
	expandTick?: number
}
