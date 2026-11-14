import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router'

const Workspace = lazy(() => import('../pages/Workspace').then((m) => ({ default: m.Workspace })))

export const routes: RouteObject[] = [
	{ path: '/', element: <Workspace /> },
	{ path: '*', element: <Navigate to="/" replace /> },
]

if (import.meta.env.DEV) {
	const UiPage = lazy(() => import('../pages/Ui').then((m) => ({ default: m.UiPage })))
	const IconsPage = lazy(() => import('../pages/Icons').then((m) => ({ default: m.IconsPage })))
	const ChatPage = lazy(() => import('../pages/Chat').then((m) => ({ default: m.ChatPage })))
	routes.push({
		path: '/ui',
		children: [
			{ index: true, element: <Navigate to="actions" replace /> },
			{ path: ':groupId', element: <UiPage /> },
		],
	})
	routes.push({
		path: '/icons',
		children: [
			{ index: true, element: <Navigate to="color" replace /> },
			{ path: ':groupId', element: <IconsPage /> },
		],
	})
	routes.push({ path: '/chat', element: <ChatPage /> })
}
