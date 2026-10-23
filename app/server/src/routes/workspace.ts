import { Router } from 'express'
import { defaultCwd } from '../sessions/store.js'

export function workspaceRouter(): Router {
	const router = Router()
	router.get('/api/workspace', (_req, res) => {
		res.json({ cwd: defaultCwd() })
	})
	return router
}
