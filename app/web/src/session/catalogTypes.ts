export type SessionStatus = 'idle' | 'running'

export type CatalogSession = {
	id: string
	cwd: string
	name: string
	firstMessage: string
	created: string
	modified: string
	status: SessionStatus
}

export type CatalogProject = {
	id: string
	cwd: string
	name: string
	position: number
	created: string
	modified: string
}

export type SseStatus = 'connecting' | 'open' | 'reconnecting'
