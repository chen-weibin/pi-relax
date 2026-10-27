import { Suspense } from 'react'
import { useRoutes } from 'react-router'
import { routes } from './router'

export function App() {
	const element = useRoutes(routes)
	return <Suspense fallback={null}>{element}</Suspense>
}
