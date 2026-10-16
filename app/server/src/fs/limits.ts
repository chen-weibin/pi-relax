const DEFAULT_MAX_BYTES = 16 * 1024 * 1024

function positiveInt(raw: string | undefined, fallback: number): number {
	if (raw === undefined || raw === '') return fallback
	const n = Number(raw)
	if (!Number.isInteger(n) || n <= 0) return fallback
	return n
}

/** 一次分段读取或一次整文件写入的字节上限。整文件流式读不受此限制。 */
export function fsMaxBytes(): number {
	return positiveInt(process.env.FS_MAX_BYTES, DEFAULT_MAX_BYTES)
}

/** 同一根目录上的变化合成一条推送前等待的毫秒数。 */
export function fsWatchDebounceMs(): number {
	return positiveInt(process.env.FS_WATCH_DEBOUNCE_MS, 600)
}

/** 同时存在的根目录监听个数。多个连接订同一个根只占 1。 */
export function fsWatchMax(): number {
	return positiveInt(process.env.FS_WATCH_MAX, 16)
}
