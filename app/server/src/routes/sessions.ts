import { Router } from 'express'
import type { Agent, StreamingBehavior } from '../agent/agent.js'
import { asyncHandler, HttpError } from '../utils/errors.js'
import { bodyText, cwdOf, optionalString } from '../utils/request.js'

function thinkingLevelOf(body: unknown): string | undefined {
	const level = optionalString(body, 'thinkingLevel')
	if (level === null) throw new HttpError(400, 'BAD_REQUEST', 'thinkingLevel must be a string')
	return level
}

function modelField(body: unknown, key: 'provider' | 'model'): string | undefined {
	const value = optionalString(body, key)
	if (value === null) throw new HttpError(400, 'BAD_REQUEST', `${key} must be a string`)
	return value
}

function streamingBehaviorOf(body: unknown): StreamingBehavior | undefined {
	const value = optionalString(body, 'streamingBehavior')
	if (value === undefined) return undefined
	if (value === 'steer' || value === 'followUp') return value
	throw new HttpError(400, 'BAD_REQUEST', 'streamingBehavior must be steer or followUp')
}

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
			const record = await agent.prompt({
				text,
				cwd: cwdOf(req),
				thinkingLevel: thinkingLevelOf(req.body),
				provider: modelField(req.body, 'provider'),
				model: modelField(req.body, 'model'),
			})
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
			const record = await agent.prompt({
				text,
				sessionId: req.params.id as string,
				thinkingLevel: thinkingLevelOf(req.body),
				streamingBehavior: streamingBehaviorOf(req.body),
				provider: modelField(req.body, 'provider'),
				model: modelField(req.body, 'model'),
			})
			res.status(202).json(record)
		}),
	)

	router.post(
		'/api/sessions/:id/model',
		asyncHandler(async (req, res) => {
			const provider = optionalString(req.body, 'provider')
			const model = optionalString(req.body, 'model')
			if (provider === null || model === null) {
				throw new HttpError(400, 'BAD_REQUEST', 'provider and model must be strings')
			}
			if (!provider || !model) throw new HttpError(400, 'BAD_REQUEST', 'provider and model are required')
			res.json(await agent.selectModel(req.params.id as string, provider, model))
		}),
	)

	router.post(
		'/api/sessions/:id/name',
		asyncHandler(async (req, res) => {
			const name = optionalString(req.body, 'name')
			if (name === undefined || name === null) throw new HttpError(400, 'BAD_REQUEST', 'name is required')
			res.json(await agent.rename(req.params.id as string, name))
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
