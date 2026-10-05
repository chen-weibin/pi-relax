import type { SessionContext, SessionInfo } from '@earendil-works/pi-coding-agent'

/** idle：未生成。running：正在生成（含自动重试等待）。 */
export type SessionStatus = 'idle' | 'running'

export type SessionRecord = Omit<SessionInfo, 'path' | 'allMessagesText' | 'created' | 'modified'> & {
	created: string
	modified: string
	status: SessionStatus
}

export type SessionHistory = SessionContext
