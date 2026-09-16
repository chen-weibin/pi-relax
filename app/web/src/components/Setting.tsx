import { UserBar } from './UserBar'

export function Setting() {
	return (
		<div className="fixed inset-0 z-50 flex bg-app">
			<aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-border bg-sidebar">
				<UserBar />
			</aside>
			<main className="flex-1" />
		</div>
	)
}
