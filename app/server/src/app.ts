import cors from 'cors'
import express from 'express'
import { Agent } from './agent/agent.js'
import { serverConfig } from './config/server.js'
import { errorHandler, notFound } from './utils/errors.js'
import { healthRouter } from './routes/health.js'
import { modelsRouter } from './routes/models.js'
import { sessionsRouter } from './routes/sessions.js'
import { settingsRouter } from './routes/settings.js'
import { fsRouter } from './routes/fs.js'
import { projectsRouter } from './routes/projects.js'

export function createApp(options: { agent?: Agent } = {}) {
	const agent = options.agent ?? new Agent()
	const app = express()
	app.use(cors({ exposedHeaders: ['X-Relax-Transfer', 'Content-Range', 'Accept-Ranges'] }))
	app.use(express.json({ limit: serverConfig.http.jsonBodyLimit }))
	app.use(healthRouter)
	app.use(modelsRouter())
	app.use(settingsRouter(agent))
	app.use(sessionsRouter(agent))
	app.use(projectsRouter(agent))
	app.use(fsRouter())
	app.use(notFound)
	app.use(errorHandler)
	return app
}
