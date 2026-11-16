import { Router } from 'express'
import {
	availableModels,
	createCustomProvider,
	deleteApiKey,
	deleteCustomProvider,
	getCustomProvider,
	getCustomProviderMeta,
	listCustomProviders,
	listProviders,
	modelThinkingLevels,
	providerModels,
	readDefault,
	refreshModels,
	saveApiKey,
	updateCustomProvider,
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

function customBody(body: unknown): Record<string, unknown> {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		throw new HttpError(400, 'BAD_REQUEST', 'body must be an object')
	}
	return body as Record<string, unknown>
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
		'/api/custom-providers/meta',
		asyncHandler(async (_req, res) => {
			res.json(getCustomProviderMeta())
		}),
	)

	router.get(
		'/api/custom-providers',
		asyncHandler(async (_req, res) => {
			res.json({ providers: await listCustomProviders() })
		}),
	)

	router.get(
		'/api/custom-providers/:id',
		asyncHandler(async (req, res) => {
			res.json({ provider: await getCustomProvider(req.params.id as string) })
		}),
	)

	router.post(
		'/api/custom-providers',
		asyncHandler(async (req, res) => {
			const body = customBody(req.body)
			const provider = await createCustomProvider({
				id: body.id as string,
				name: body.name as string | undefined,
				baseUrl: body.baseUrl as string,
				api: body.api as string,
				apiKey: body.apiKey as string | undefined,
				headers: body.headers as Record<string, string> | undefined,
				authHeader: body.authHeader as boolean | undefined,
				models: body.models as never,
			})
			res.status(201).json({ provider })
		}),
	)

	router.put(
		'/api/custom-providers/:id',
		asyncHandler(async (req, res) => {
			const body = customBody(req.body)
			const provider = await updateCustomProvider(req.params.id as string, {
				name: body.name as string | undefined,
				baseUrl: body.baseUrl as string,
				api: body.api as string,
				apiKey: body.apiKey as string | undefined,
				headers: body.headers as Record<string, string> | undefined,
				authHeader: body.authHeader as boolean | undefined,
				models: body.models as never,
			})
			res.json({ provider })
		}),
	)

	router.delete(
		'/api/custom-providers/:id',
		asyncHandler(async (req, res) => {
			await deleteCustomProvider(req.params.id as string)
			res.status(204).end()
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
