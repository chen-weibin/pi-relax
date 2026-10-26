export type SessionDraft = {
	cwd: string
	createdAt: number
}

export const DRAFT_TITLE = '新对话'

export function draftId(cwd: string): string {
	return `draft:${cwd}`
}

/** 每个目录最多一条。已有则不改创建时间。 */
export function ensureDraft(drafts: SessionDraft[], cwd: string, now: number): SessionDraft[] {
	if (drafts.some((draft) => draft.cwd === cwd)) return drafts
	return [{ cwd, createdAt: now }, ...drafts]
}

/** 有选中的真实会话就用它所在目录，否则用当前草稿，再否则用默认工作区。 */
export function draftTarget(
	openSessionCwd: string | null,
	activeDraftCwd: string | null,
	defaultCwd: string | null,
): string | null {
	return openSessionCwd ?? activeDraftCwd ?? defaultCwd
}
