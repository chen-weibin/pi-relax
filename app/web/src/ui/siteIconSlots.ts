/** 一排最多 `max` 个圆，含末尾数字。超出时前面留 `max - 1` 个，其余收进 `+N`。 */
export function siteIconSlots<T>(items: readonly T[], max?: number): { shown: T[]; overflow: number } {
	if (max == null || !Number.isFinite(max) || max < 1 || items.length <= max) {
		return { shown: items.slice(), overflow: 0 }
	}
	const keep = max - 1
	return { shown: items.slice(0, keep), overflow: items.length - keep }
}

/** 重叠一排占的宽度。后一颗用负边距叠上来。 */
export function stackedWidth(count: number, px: number, overlap: number): number {
	if (count <= 0 || px <= 0) return 0
	return px + Math.max(0, count - 1) * (px - overlap)
}

/** 给定宽度里能放下几个圆，含末尾数字。 */
export function circlesThatFit(available: number, px: number, overlap: number): number {
	if (!(available > 0) || !(px > 0)) return 1
	const step = px - overlap
	if (step <= 0) return Number.MAX_SAFE_INTEGER
	if (available < px) return 1
	return 1 + Math.floor((available - px) / step)
}

/** `max` 和单行能放下的圆数同时生效，取更紧的那个。 */
export function limitSiteIcons<T>(items: readonly T[], max?: number, circles?: number): { shown: T[]; overflow: number } {
	let cap = max
	if (circles != null && Number.isFinite(circles)) {
		const rounded = Math.max(1, Math.floor(circles))
		cap = cap == null || !(cap >= 1) ? rounded : Math.min(cap, rounded)
	}
	return siteIconSlots(items, cap)
}
