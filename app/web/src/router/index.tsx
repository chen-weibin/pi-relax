import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router'

const Workspace = lazy(() => import('../pages/Workspace').then((m) => ({ default: m.Workspace })))
const UiPage = lazy(() => import('../pages/Ui').then((m) => ({ default: m.UiPage })))

export const routes: RouteObject[] = [
	{ path: '/', element: <Workspace /> },
	{ path: '/ui', element: <UiPage /> },
	{ path: '*', element: <Navigate to="/" replace /> },
]
