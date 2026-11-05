import type { FsChangeEvent } from '../../../api/fs/frames'

export const SAVE_DEBOUNCE_MS = 400

export type DraftClock = {
	draft: string
	saved: string
	dueAt: number | null
	writing: string | null
}

export function createDraftClock(text: string): DraftClock {
	return { draft: text, saved: text, dueAt: null, writing: null }
}

export function isDraftDirty(clock: DraftClock): boolean {
	return clock.draft !== clock.saved || clock.writing !== null || clock.dueAt !== null
}

export function editDraftClock(clock: DraftClock, text: string, now: number): DraftClock {
	if (text === clock.draft) return clock
	if (text === clock.saved && clock.writing === null) {
		return { ...clock, draft: text, dueAt: null }
	}
	return { ...clock, draft: text, dueAt: now + SAVE_DEBOUNCE_MS }
}

export function takeDraftWrite(clock: DraftClock, now: number): { clock: DraftClock; text: string | null } {
	if (clock.writing !== null) return { clock, text: null }
	if (clock.dueAt === null || now < clock.dueAt) return { clock, text: null }
	if (clock.draft === clock.saved) return { clock: { ...clock, dueAt: null }, text: null }
	return { clock: { ...clock, dueAt: null, writing: clock.draft }, text: clock.draft }
}

export function finishDraftWrite(clock: DraftClock, wrote: string, now: number): DraftClock {
	const writing = clock.writing === wrote ? null : clock.writing
	const next: DraftClock = { ...clock, saved: wrote, writing }
	if (next.draft !== next.saved && next.writing === null) {
		return { ...next, dueAt: now + SAVE_DEBOUNCE_MS }
	}
	return next
}

export function openFileDiskAction(
	dirty: boolean,
	events: readonly FsChangeEvent[],
): 'keep' | 'reload' | 'gone' | 'notice' {
	const mine = events.filter((event) => event === 'change' || event === 'unlink' || event === 'add')
	if (mine.length === 0) return 'keep'
	if (mine.includes('unlink')) return dirty ? 'notice' : 'gone'
	return dirty ? 'notice' : 'reload'
}
