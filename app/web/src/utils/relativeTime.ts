const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const YEAR = 365 * DAY

export function formatRelativeTime(ms: number, now: number = Date.now()): string {
	const diff = now - ms
	if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MIN))}m`
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h`
	if (diff < WEEK) return `${Math.floor(diff / DAY)}d`
	if (diff < YEAR) return `${Math.floor(diff / WEEK)}w`
	return `${Math.max(1, Math.floor(diff / YEAR))}y`
}
