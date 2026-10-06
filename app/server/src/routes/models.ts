import { Router } from 'express'
import { modelThinkingLevels } from '../agent/factory.js'
import { asyncHandler, HttpError } from '../utils/errors.js'

export function modelsRouter(): Router {
	const router = Router()

	router.get(
		'/api/models/thinking-levels',
		asyncHandler(async (req, res) => {
			const provider = typeof req.query.provider === 'string' ? req.query.provider : ''
			const id = typeof req.query.id === 'string' ? req.query.id : ''
			if (!provider || !id) throw new HttpError(400, 'BAD_REQUEST', 'provider and id are required')
			const found = modelThinkingLevels(provider, id)
			if (!found) throw new HttpError(404, 'NOT_FOUND', 'Model not found')
			res.json(found)
		}),
	)

	return router
}
