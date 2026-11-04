import { blockTitle, type Segment } from './explore.ts'
import type { BlockSnapshot } from './types.ts'

export const PLANNING_LABEL = '正在规划下一步行动'

export type ExploreChrome =
	| { mode: 'activity'; label: string }
	| { mode: 'single'; block: BlockSnapshot }
	| { mode: 'group'; trail: string | null; activity: string | null; focusKey: string | null }

/** `live` 表示这一组还是当前回复的末尾，并且这一轮还在跑。 */
export function chromeForExplore(blocks: readonly BlockSnapshot[], live: boolean): ExploreChrome {
	const first = blocks[0]
	if (!first) return { mode: 'activity', label: PLANNING_LABEL }
	if (!live && blocks.length === 1) return { mode: 'single', block: first }
	const tools = blocks.filter((block) => block.kind === 'tool').length
	const trail = blocks.length >= 2 && tools > 0 ? `${tools} 个工具` : null
	if (!live) return { mode: 'group', trail, activity: null, focusKey: null }
	const open = [...blocks].reverse().find((block) => block.contentPhase === 'open')
	if (!open) return { mode: 'group', trail, activity: PLANNING_LABEL, focusKey: null }
	return { mode: 'group', trail, activity: blockTitle(open), focusKey: open.key }
}

/** 活动行只挂在当前回复的末尾。还没有任何块时是规划；探索组不是末尾时不显示。 */
export function activityForTail(
	segments: readonly Segment[],
	live: boolean,
	awaiting: boolean,
): { label: string; focusKey: string | null } | null {
	if (awaiting) return { label: PLANNING_LABEL, focusKey: null }
	if (!live) return null
	const last = segments[segments.length - 1]
	if (!last || last.type !== 'explore') return null
	const chrome = chromeForExplore(last.blocks, true)
	if (chrome.mode !== 'group' || !chrome.activity) return null
	return { label: chrome.activity, focusKey: chrome.focusKey }
}
