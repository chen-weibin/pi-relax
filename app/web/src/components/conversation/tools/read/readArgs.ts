import { fileBasename } from '../fileChange/fileChange.ts'

export type ReadArgs = {
	path: string
	/** 展示用文件名。path 为空时是空串。 */
	name: string
	offset?: number
	limit?: number
	/** `L起-止`。没有行号时是空串。 */
	lineLabel: string
}

function finiteNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** `L起-止`。offset / limit 都没有（含 null）时不写行号。 */
export function formatReadLines(offset: number | undefined, limit: number | undefined): string {
	if (offset == null && limit == null) return ''
	if (offset == null) return `L1-${limit}`
	if (limit == null) return `L${offset}`
	return `L${offset}-${offset + limit - 1}`
}

/** 流式期 args 为 null 时返回空。 */
export function parseReadArgs(args: Record<string, unknown> | null): ReadArgs {
	if (!args) return { path: '', name: '', lineLabel: '' }
	const path = typeof args.path === 'string' ? args.path : ''
	const offset = finiteNumber(args.offset)
	const limit = finiteNumber(args.limit)
	return {
		path,
		name: fileBasename(path),
		...(offset !== undefined ? { offset } : {}),
		...(limit !== undefined ? { limit } : {}),
		lineLabel: formatReadLines(offset, limit),
	}
}
