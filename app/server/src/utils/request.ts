/** 从 JSON 请求体取出 text。 */
export function bodyText(body: unknown): string {
	if (!body || typeof body !== 'object' || !('text' in body)) return ''
	return typeof body.text === 'string' ? body.text : ''
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
