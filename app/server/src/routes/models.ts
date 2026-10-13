import { Router } from 'express'
import {
	availableModels,
	deleteApiKey,
	listProviders,
	modelThinkingLevels,
	providerModels,
	readDefault,
	refreshModels,
	saveApiKey,
	writeDefault,
} from '../agent/models.js'
import { asyncHandler, HttpError } from '../utils/errors.js'
import { optionalString } from '../utils/request.js'

function requiredPair(body: unknown): { provider: string; id: string } {
	const provider = optionalString(body, 'provider')
	const model = optionalString(body, 'model')
	if (provider === null || model === null) {
		throw new HttpError(400, 'BAD_REQUEST', 'provider and model must be strings')
	}
	if (!provider || !model) throw new HttpError(400, 'BAD_REQUEST', 'provider and model are required')
	return { provider, id: model }
}

export function modelsRouter(): Router {
	const router = Router()

	router.get(
		'/api/providers',
		asyncHandler(async (_req, res) => {
			res.json({ providers: await listProviders() })
		}),
	)

	router.put(
		'/api/providers/:id',
		asyncHandler(async (req, res) => {
			const apiKey = optionalString(req.body, 'apiKey')
			if (apiKey === null) throw new HttpError(400, 'BAD_REQUEST', 'apiKey must be a string')
			if (!apiKey?.trim()) throw new HttpError(400, 'BAD_REQUEST', 'apiKey is required')
			await saveApiKey(req.params.id as string, apiKey)
			res.json({ id: req.params.id, configured: true })
		}),
	)

	router.delete(
		'/api/providers/:id',
		asyncHandler(async (req, res) => {
			await deleteApiKey(req.params.id as string)
			res.status(204).end()
		}),
	)

	router.get(
		'/api/providers/:id/models',
		asyncHandler(async (req, res) => {
			res.json({ models: await providerModels(req.params.id as string) })
		}),
	)

	router.get(
		'/api/models',
		asyncHandler(async (req, res) => {
			const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined
			res.json(await availableModels(provider))
		}),
	)

	router.get(
		'/api/models/default',
		asyncHandler(async (_req, res) => {
			res.json(await readDefault())
		}),
	)

	router.put(
		'/api/models/default',
		asyncHandler(async (req, res) => {
			const { provider, id } = requiredPair(req.body)
			res.json({ model: await writeDefault(provider, id) })
		}),
	)

	router.post(
		'/api/models/refresh',
		asyncHandler(async (_req, res) => {
			res.json(await refreshModels())
		}),
	)

	router.get(
		'/api/models/thinking-levels',
		asyncHandler(async (req, res) => {
			const provider = typeof req.query.provider === 'string' ? req.query.provider : ''
			const id = typeof req.query.id === 'string' ? req.query.id : ''
			if (!provider || !id) throw new HttpError(400, 'BAD_REQUEST', 'provider and id are required')
			const found = await modelThinkingLevels(provider, id)
			if (!found) throw new HttpError(404, 'NOT_FOUND', 'Model not found')
			res.json(found)
		}),
	)

	return router
}
