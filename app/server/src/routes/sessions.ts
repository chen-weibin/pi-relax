import { Router } from 'express'
import type { Agent } from '../agent/agent.js'
import { asyncHandler, HttpError } from '../utils/errors.js'
import { bodyText, cwdOf } from '../utils/request.js'

export function sessionsRouter(agent: Agent): Router {
	const router = Router()

	router.get('/api/sessions/events', (req, res) => {
		res.setHeader('Content-Type', 'text/event-stream')
		res.setHeader('Cache-Control', 'no-cache')
		res.setHeader('Connection', 'keep-alive')
		res.flushHeaders?.()
		const send = (sessionId: string, event: unknown) => {
			res.write(`data: ${JSON.stringify({ sessionId, event })}\n\n`)
		}
		const unsubscribe = agent.subscribe(send)
		const ping = setInterval(() => {
			res.write(': ping\n\n')
		}, 15_000)
		req.on('close', () => {
			clearInterval(ping)
			unsubscribe()
		})
	})

	router.post(
		'/api/sessions',
		asyncHandler(async (req, res) => {
			const text = bodyText(req.body)
			if (!text) throw new HttpError(400, 'BAD_REQUEST', 'text is required')
			const record = await agent.prompt({ text, cwd: cwdOf(req) })
			res.status(202).json(record)
		}),
	)

	router.get(
		'/api/sessions',
		asyncHandler(async (req, res) => {
			const cwd = typeof req.query.cwd === 'string' ? req.query.cwd : undefined
			res.json({ sessions: await agent.list(cwd) })
		}),
	)

	router.get(
		'/api/sessions/:id/history',
		asyncHandler(async (req, res) => {
			res.json(await agent.history(req.params.id as string))
		}),
	)

	router.post(
		'/api/sessions/:id/prompt',
		asyncHandler(async (req, res) => {
			const text = bodyText(req.body)
			if (!text) throw new HttpError(400, 'BAD_REQUEST', 'text is required')
			const record = await agent.prompt({ text, sessionId: req.params.id as string })
			res.status(202).json(record)
		}),
	)

	router.post(
		'/api/sessions/:id/abort',
		asyncHandler(async (req, res) => {
			res.json(await agent.abort(req.params.id as string))
		}),
	)

	router.get(
		'/api/sessions/:id',
		asyncHandler(async (req, res) => {
			res.json(await agent.get(req.params.id as string))
		}),
	)

	router.delete(
		'/api/sessions/:id',
		asyncHandler(async (req, res) => {
			await agent.remove(req.params.id as string)
			res.status(204).end()
		}),
	)

	return router
}
