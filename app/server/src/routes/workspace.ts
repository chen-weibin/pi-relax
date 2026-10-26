import { basename } from 'node:path'
import { Router } from 'express'
import { defaultCwd } from '../sessions/store.js'

export function workspaceRouter(): Router {
	const router = Router()
	router.get('/api/workspace', (_req, res) => {
		const cwd = defaultCwd()
		res.json({ cwd, name: basename(cwd) })
	})
	return router
}
