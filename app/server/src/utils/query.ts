import { HttpError } from './errors.js'

export const PAGE_LIMIT_MAX = 200

export type PageWindow = { offset: number; limit: number }

function integerQuery(value: unknown, name: string): number {
	if (typeof value !== 'string' || !/^\d+$/.test(value)) {
		throw new HttpError(400, 'BAD_REQUEST', `${name} must be a non-negative integer`)
	}
	return Number(value)
}

/** 都不传则不分页。只传一个则 400。limit 至少 1，至多 PAGE_LIMIT_MAX。 */
export function pageWindow(query: { offset?: unknown; limit?: unknown }): PageWindow | undefined {
	const hasOffset = query.offset !== undefined
	const hasLimit = query.limit !== undefined
	if (!hasOffset && !hasLimit) return undefined
	if (!hasOffset || !hasLimit) {
		throw new HttpError(400, 'BAD_REQUEST', 'offset and limit must be provided together')
	}
	const offset = integerQuery(query.offset, 'offset')
	const limit = integerQuery(query.limit, 'limit')
	if (limit < 1) throw new HttpError(400, 'BAD_REQUEST', 'limit must be at least 1')
	if (limit > PAGE_LIMIT_MAX) {
		throw new HttpError(400, 'BAD_REQUEST', `limit must be at most ${PAGE_LIMIT_MAX}`)
	}
	return { offset, limit }
}

/** 缺省为 undefined。有值但不是可解析的时间则 400。 */
export function optionalTime(value: unknown, name: string): string | undefined {
	if (value === undefined) return undefined
	if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
		throw new HttpError(400, 'BAD_REQUEST', `${name} must be an ISO time`)
	}
	return value
}

export function timeInRange(iso: string, from?: string, to?: string): boolean {
	const time = Date.parse(iso)
	if (from !== undefined && time < Date.parse(from)) return false
	if (to !== undefined && time > Date.parse(to)) return false
	return true
}

export function completedQuery(value: unknown): boolean | undefined {
	if (value === undefined) return undefined
	if (value === 'true') return true
	if (value === 'false') return false
	throw new HttpError(400, 'BAD_REQUEST', 'completed must be true or false')
}
