import { Router } from 'express'
import type { Agent } from '../agent/agent.js'
import {
	ABORT_POLICIES,
	DELETE_MODES,
	QUEUE_MODES,
	patchSettings,
	readGlobalSettings,
	type SettingsPatch,
} from '../config/settings.js'
import { asyncHandler, HttpError } from '../utils/errors.js'

const KEYS = ['steeringMode', 'followUpMode', 'abortPolicy', 'sessionDelete', 'projectDelete'] as const

export function settingsRouter(agent: Agent): Router {
	const router = Router()

	router.get('/api/settings', (_req, res) => {
		res.json(readGlobalSettings())
	})

	router.patch(
		'/api/settings',
		asyncHandler(async (req, res) => {
			const patch = settingsPatch(req.body)
			const saved = patchSettings(patch)
			agent.applyQueueModes(patch)
			res.json(saved)
		}),
	)

	return router
}

function settingsPatch(body: unknown): SettingsPatch {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		throw new HttpError(400, 'BAD_REQUEST', 'JSON object required')
	}
	const record = body as Record<string, unknown>
	const keys = Object.keys(record)
	if (keys.length === 0) throw new HttpError(400, 'BAD_REQUEST', 'At least one setting is required')
	for (const key of keys) {
		if (!KEYS.includes(key as (typeof KEYS)[number])) {
			throw new HttpError(400, 'BAD_REQUEST', `Unknown setting: ${key}`)
		}
	}
	const patch: SettingsPatch = {}
	if ('steeringMode' in record) patch.steeringMode = oneOf(record.steeringMode, 'steeringMode', QUEUE_MODES)
	if ('followUpMode' in record) patch.followUpMode = oneOf(record.followUpMode, 'followUpMode', QUEUE_MODES)
	if ('abortPolicy' in record) patch.abortPolicy = oneOf(record.abortPolicy, 'abortPolicy', ABORT_POLICIES)
	if ('sessionDelete' in record) patch.sessionDelete = oneOf(record.sessionDelete, 'sessionDelete', DELETE_MODES)
	if ('projectDelete' in record) patch.projectDelete = oneOf(record.projectDelete, 'projectDelete', DELETE_MODES)
	return patch
}

function oneOf<T extends string>(value: unknown, name: string, allowed: readonly T[]): T {
	if (allowed.includes(value as T)) return value as T
	throw new HttpError(400, 'BAD_REQUEST', `${name} must be one of ${allowed.join(', ')}`)
}
