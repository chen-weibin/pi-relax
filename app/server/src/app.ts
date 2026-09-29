import cors from 'cors'
import express from 'express'
import { errorHandler, notFound } from './http/errors.js'
import { healthRouter } from './http/health.js'

export function createApp() {
	const app = express()
	app.use(cors())
	app.use(express.json({ limit: '1mb' }))
	app.use(healthRouter)
	app.use(notFound)
	app.use(errorHandler)
	return app
}
