import type { SessionContext } from '@earendil-works/pi-coding-agent'

/** idle：未生成。running：正在生成（含自动重试等待）。 */
export type SessionStatus = 'idle' | 'running'

/** 列表和单条信息。标题只看 name，不另给 firstMessage。 */
export type SessionRecord = {
	id: string
	cwd: string
	name: string
	created: string
	modified: string
	status: SessionStatus
	completed: boolean
}

export type SessionHistory = SessionContext
