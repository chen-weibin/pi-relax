import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router'

const Workspace = lazy(() => import('../pages/Workspace').then((m) => ({ default: m.Workspace })))

export const routes: RouteObject[] = [
	{ path: '/', element: <Workspace /> },
	{ path: '*', element: <Navigate to="/" replace /> },
]

if (import.meta.env.DEV) {
	const UiPage = lazy(() => import('../pages/Ui').then((m) => ({ default: m.UiPage })))
	routes.push({ path: '/ui', element: <UiPage /> })
}
