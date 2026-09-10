const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY

export function formatRelativeTime(ms: number, now: number = Date.now()): string {
	const diff = now - ms
	if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MIN))}m`
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h`
	if (diff < WEEK) return `${Math.floor(diff / DAY)}d`
	return `${Math.floor(diff / WEEK)}w`
}
