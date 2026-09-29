import type { ErrorRequestHandler, RequestHandler } from 'express'

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
	console.error(err)
	res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal error' } })
}
