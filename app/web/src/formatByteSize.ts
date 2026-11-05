const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** 1024 进制。整数不带小数。 */
export function formatByteSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
	let value = bytes
	let unit = 0
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024
		unit += 1
	}
	const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
	const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
	return `${text} ${UNITS[unit]}`
}
