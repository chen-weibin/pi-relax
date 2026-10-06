/** 从 JSON 请求体取出 text。 */
export function bodyText(body: unknown): string {
	if (!body || typeof body !== 'object' || !('text' in body)) return ''
	return typeof body.text === 'string' ? body.text : ''
}

/** 从 JSON 请求体取出可选字符串字段。缺省为 undefined，类型不对返回 null。 */
export function optionalString(body: unknown, key: string): string | undefined | null {
	if (!body || typeof body !== 'object' || !(key in body)) return undefined
	const value = (body as Record<string, unknown>)[key]
	if (value === undefined) return undefined
	return typeof value === 'string' ? value : null
}

/** 从 query 或 body 取出 cwd。 */
export function cwdOf(req: { body?: unknown; query: { cwd?: unknown } }): string | undefined {
	const fromQuery = req.query.cwd
	if (typeof fromQuery === 'string' && fromQuery) return fromQuery
	const body = req.body
	if (body && typeof body === 'object' && 'cwd' in body && typeof body.cwd === 'string') {
		return body.cwd
	}
	return undefined
}
