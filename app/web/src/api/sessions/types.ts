import type { SessionContext } from '@earendil-works/pi-coding-agent'

export type { SessionContext }

/** 列表里的一行，字段与服务端 JSON 一致。 */
export type SessionRecord = {
	id: string
	cwd: string
	name?: string
	firstMessage?: string
	created: string
	modified: string
	status?: string
	parentSessionPath?: string
	messageCount?: number
	completed?: boolean
}

export type SessionList = {
	sessions: SessionRecord[]
	total: number
}
