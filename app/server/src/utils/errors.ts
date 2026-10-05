import type { ErrorRequestHandler, RequestHandler } from 'express'

export class HttpError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message)
		this.name = 'HttpError'
	}
}

export class BusyError extends Error {
	readonly code = 'BUSY' as const
	constructor(message = 'Session is already generating') {
		super(message)
		this.name = 'BusyError'
	}
}

export class SessionNotFoundError extends Error {
	readonly code = 'NOT_FOUND' as const
	constructor(id: string) {
		super(`Session not found: ${id}`)
		this.name = 'SessionNotFoundError'
	}
}

export const notFound: RequestHandler = (_req, res) => {
	res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } })
}

function isBadJson(err: unknown): err is SyntaxError {
	return (
		err instanceof SyntaxError &&
		'status' in err &&
		err.status === 400 &&
		'type' in err &&
		err.type === 'entity.parse.failed'
	)
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	if (isBadJson(err)) {
		res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } })
		return
	}
	if (err instanceof BusyError) {
		res.status(409).json({ error: { code: 'BUSY', message: err.message } })
		return
	}
	if (err instanceof SessionNotFoundError) {
		res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } })
		return
	}
	if (err instanceof HttpError) {
		res.status(err.status).json({ error: { code: err.code, message: err.message } })
		return
	}
	console.error(err)
	res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal error' } })
}

/** 把异步路由里的拒绝交给 Express 错误中间件。 */
export function asyncHandler(
	fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) => Promise<void>,
): RequestHandler {
	return (req, res, next) => {
		void fn(req, res).catch(next)
	}
}
