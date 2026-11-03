const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

const FENCE = /^ {0,3}(`{3,}|~{3,})/

/** 一帧。间隔只能是它的倍数。 */
export const FRAME_MS = 16

export type FeedMode = 'pace' | 'direct'

export type FeedConfig = {
	mode: FeedMode
	/** 间隔 = frames × 16ms，至少 1。 */
	frames: number
	/** 第一档：落后不超过这么多时，每拍交 step 个字。后面几档由它推出来。 */
	lag: number
	step: number
}

/** 快追上时每 96ms 交 2 个字，大约每秒 20 字。 */
export const defaultFeed: FeedConfig = {
	mode: 'pace',
	frames: 6,
	lag: 32,
	step: 2,
}

export type PaceRung = { lag: number; step: number }

/** 落后上限每次 ×2，每拍字数每次 ×3。字数涨得比落后快，所以不是线性。 */
export function paceLadder(lag: number, step: number): PaceRung[] {
	const baseLag = Math.max(0, lag)
	const baseStep = Math.max(1, step)
	return [
		{ lag: baseLag, step: baseStep },
		{ lag: baseLag * 2, step: baseStep * 3 },
		{ lag: baseLag * 4, step: baseStep * 9 },
		{ lag: Number.POSITIVE_INFINITY, step: baseStep * 27 },
	]
}

function nextGrapheme(text: string, index: number): number {
	const first = segmenter.segment(text.slice(index, index + 32))[Symbol.iterator]().next().value
	if (!first || first.segment.length === 0) return Math.min(text.length, index + 1)
	return index + first.segment.length
}

function endOfLine(text: string, index: number): number {
	const nl = text.indexOf('\n', index)
	return nl === -1 ? text.length : nl + 1
}

/** 只认已经换行结束的围栏。行尾还没到的 ``` 不算进了代码块。 */
function inFence(text: string, index: number): boolean {
	let open = false
	let i = 0
	while (i < index) {
		const nl = text.indexOf('\n', i)
		if (nl === -1 || nl >= index) break
		if (FENCE.test(text.slice(i, nl))) open = !open
		i = nl + 1
	}
	return open
}

function startsFenceLine(text: string, index: number): boolean {
	if (index > 0 && text[index - 1] !== '\n') return false
	const nl = text.indexOf('\n', index)
	return FENCE.test(text.slice(index, nl === -1 ? text.length : nl))
}

function takes(behind: number, lag: number, step: number): number {
	for (const rung of paceLadder(lag, step)) {
		if (behind <= rung.lag) return rung.step
	}
	return Math.max(1, step)
}

/** 流式时交出一个更长的前缀。围栏按行跳，其余按字素走阶梯。结束或文本被换掉时直接用全文。 */
export function advanceShown(
	text: string,
	shown: string,
	streaming: boolean,
	rule: { lag: number; step: number } = defaultFeed,
): string {
	if (!streaming || !text.startsWith(shown)) return text
	let index = shown.length
	if (index >= text.length) return text
	let budget = takes(text.length - index, rule.lag, rule.step)
	while (budget > 0 && index < text.length) {
		const line = inFence(text, index) || startsFenceLine(text, index)
		index = line ? endOfLine(text, index) : nextGrapheme(text, index)
		budget -= line ? budget : 1
	}
	return text.slice(0, index)
}
