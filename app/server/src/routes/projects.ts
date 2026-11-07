import { Router } from 'express'
import type { Agent } from '../agent/agent.js'
import {
	countProjects,
	createProject,
	deleteProject,
	getProject,
	listProjects,
	moveProject,
	projectCwd,
	renameProject,
	resolveProjectCwd,
} from '../projects/store.js'
import { matchesPurge, purgeBody, purgeSessions, sessionsForCwd } from '../sessions/query.js'
import { asyncHandler, HttpError } from '../utils/errors.js'
import { optionalString } from '../utils/request.js'
import { optionalTime, pageWindow } from '../utils/query.js'

function timeFilter(query: { createdFrom?: unknown; createdTo?: unknown }) {
	return {
		createdFrom: optionalTime(query.createdFrom, 'createdFrom'),
		createdTo: optionalTime(query.createdTo, 'createdTo'),
	}
}

function requireCwd(id: string): string {
	const cwd = projectCwd(id)
	if (!cwd) throw new HttpError(404, 'NOT_FOUND', `Project not found: ${id}`)
	return cwd
}

export function projectsRouter(agent: Agent): Router {
	const router = Router()

	router.post(
		'/api/projects',
		asyncHandler(async (req, res) => {
			const cwd = await resolveProjectCwd((req.body as { cwd?: unknown } | undefined)?.cwd)
			const name = optionalString(req.body, 'name')
			if (name === null) throw new HttpError(400, 'BAD_REQUEST', 'name must be a string')
			res.status(201).json(createProject(cwd, name))
		}),
	)

	router.get(
		'/api/projects/count',
		asyncHandler(async (req, res) => {
			res.json({ count: countProjects(timeFilter(req.query)) })
		}),
	)

	router.get(
		'/api/projects',
		asyncHandler(async (req, res) => {
			res.json(listProjects(timeFilter(req.query), pageWindow(req.query)))
		}),
	)

	router.get(
		'/api/projects/:id/sessions/count',
		asyncHandler(async (req, res) => {
			const cwd = requireCwd(req.params.id as string)
			const sessions = await sessionsForCwd(agent, cwd)
			res.json({ count: sessions.length })
		}),
	)

	router.post(
		'/api/projects/:id/sessions/purge',
		asyncHandler(async (req, res) => {
			const cwd = requireCwd(req.params.id as string)
			const filter = purgeBody(req.body)
			const sessions = await sessionsForCwd(agent, cwd)
			const matched = sessions.filter((record) => matchesPurge(record, filter))
			res.json({ deleted: await purgeSessions(agent, matched) })
		}),
	)

	router.post(
		'/api/projects/:id/purge',
		asyncHandler(async (req, res) => {
			deleteProject(req.params.id as string)
			res.status(204).end()
		}),
	)

	router.get(
		'/api/projects/:id',
		asyncHandler(async (req, res) => {
			const project = getProject(req.params.id as string)
			if (!project) throw new HttpError(404, 'NOT_FOUND', `Project not found: ${req.params.id}`)
			res.json(project)
		}),
	)

	router.patch(
		'/api/projects/:id',
		asyncHandler(async (req, res) => {
			const name = optionalString(req.body, 'name')
			if (name === undefined || name === null) throw new HttpError(400, 'BAD_REQUEST', 'name is required')
			res.json(renameProject(req.params.id as string, name))
		}),
	)

	router.post(
		'/api/projects/:id/move',
		asyncHandler(async (req, res) => {
			const index = (req.body as { index?: unknown } | undefined)?.index
			if (typeof index !== 'number') throw new HttpError(400, 'BAD_REQUEST', 'index must be a number')
			res.json(moveProject(req.params.id as string, index))
		}),
	)

	router.delete(
		'/api/projects/:id',
		asyncHandler(async (req, res) => {
			deleteProject(req.params.id as string)
			res.status(204).end()
		}),
	)

	return router
}
