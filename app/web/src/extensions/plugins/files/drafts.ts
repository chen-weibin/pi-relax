import { eventsForOpenPath, type FsChange } from '../../../api/fs/frames'
import { ApiError } from '../../../api/http'
import { fsApi } from '../../contracts/adapters/fsHttp'
import { FsError } from '../../contracts/fs'
import { useExtensionStore } from '../../store'
import { resolveFileKind } from './fileKinds'
import { openBlockReason } from './openPolicy'
import { fileNameFromPath, isFilesPayload } from './open'
import { resolveFileSize } from './treeStore'
import {
	createDraftClock,
	editDraftClock,
	finishDraftWrite,
	isDraftDirty,
	openFileDiskAction,
	takeDraftWrite,
	type DraftClock,
} from './draftSync'

export type FileDraft = {
	clock: DraftClock
	error: string | null
	notice: string | null
	blocked: string | null
}

const slots = new Map<string, FileDraft>()
const chains = new Map<string, Promise<void>>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const listeners = new Set<() => void>()
let version = 0

function syncTabTitles() {
	const store = useExtensionStore.getState()
	for (const tab of store.tabs) {
		if (tab.pluginId !== 'files' || !isFilesPayload(tab.payload) || tab.payload.kind !== 'file') continue
		const title = fileNameFromPath(tab.payload.path)
		if (tab.title !== title) store.updateTab(tab.id, { title })
	}
}

function emit() {
	version += 1
	for (const listener of listeners) listener()
	syncTabTitles()
}

export function subscribeDrafts(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function getDraftVersion() {
	return version
}

export function getDraft(path: string): FileDraft | undefined {
	return slots.get(path)
}

export function isPathDirty(path: string) {
	const slot = slots.get(path)
	return Boolean(slot && !slot.blocked && isDraftDirty(slot.clock))
}

function messageOf(err: unknown) {
	if (err instanceof FsError || err instanceof ApiError || err instanceof Error) return err.message
	return '保存失败'
}

function clearTimer(path: string) {
	const timer = timers.get(path)
	if (!timer) return
	clearTimeout(timer)
	timers.delete(path)
}

function arm(path: string) {
	const slot = slots.get(path)
	if (!slot || slot.blocked || timers.has(path) || slot.clock.writing || slot.clock.dueAt === null) return
	const wait = Math.max(0, slot.clock.dueAt - Date.now())
	timers.set(
		path,
		setTimeout(() => {
			timers.delete(path)
			const current = slots.get(path)
			if (!current || current.blocked) return
			const taken = takeDraftWrite(current.clock, Date.now())
			current.clock = taken.clock
			emit()
			if (!taken.text) return
			void enqueue(path, taken.text)
		}, wait),
	)
}

function enqueue(path: string, text: string): Promise<void> {
	const slot = slots.get(path)
	if (slot) {
		slot.clock = { ...slot.clock, writing: text, dueAt: null }
		emit()
	}
	const prev = chains.get(path) ?? Promise.resolve()
	const job = prev.then(async () => {
		const current = slots.get(path)
		if (!current) return
		try {
			await fsApi.write(path, text)
			const after = slots.get(path)
			if (!after) return
			after.error = null
			after.clock = finishDraftWrite(after.clock, text, Date.now())
			if (!isDraftDirty(after.clock)) after.notice = null
		} catch (err) {
			const after = slots.get(path)
			if (!after) return
			if (after.clock.writing === text) after.clock = { ...after.clock, writing: null }
			after.error = messageOf(err)
		}
		emit()
		arm(path)
	})
	chains.set(
		path,
		job.then(
			() => {},
			() => {},
		),
	)
	return job
}

export function editDraft(path: string, text: string) {
	const slot = slots.get(path)
	if (!slot || slot.blocked) return
	const next = editDraftClock(slot.clock, text, Date.now())
	if (next === slot.clock) return
	clearTimer(path)
	slot.clock = next
	emit()
	arm(path)
}

export function adoptDiskText(path: string, text: string) {
	const slot = slots.get(path)
	if (slot && isDraftDirty(slot.clock)) {
		slot.notice = '磁盘已变化'
		emit()
		return
	}
	if (slot && !slot.blocked && slot.clock.draft === text && slot.notice === null && slot.error === null) return
	clearTimer(path)
	slots.set(path, { clock: createDraftClock(text), error: null, notice: null, blocked: null })
	emit()
}

export function blockDraft(path: string, reason: string) {
	const slot = slots.get(path)
	if (slot && isDraftDirty(slot.clock)) {
		slot.notice = '磁盘已变化'
		emit()
		return
	}
	clearTimer(path)
	slots.set(path, {
		clock: createDraftClock(''),
		error: null,
		notice: null,
		blocked: reason,
	})
	emit()
}

async function readIfOpenable(path: string, alive: () => boolean): Promise<'dirty' | 'done'> {
	if (!alive()) return 'done'
	if (isPathDirty(path)) return 'dirty'
	const kind = resolveFileKind(path)
	if (kind.open !== 'text') {
		blockDraft(path, openBlockReason(kind, 0) ?? '当前不支持该文件类型')
		return 'done'
	}
	const size = await resolveFileSize(path)
	if (!alive()) return 'done'
	if (isPathDirty(path)) return 'dirty'
	const blocked = openBlockReason(kind, size)
	if (blocked) {
		blockDraft(path, blocked)
		return 'done'
	}
	const outcome = await fsApi.read(path)
	if (!alive()) return 'done'
	if (isPathDirty(path)) return 'dirty'
	if (outcome.kind === 'blocked') {
		blockDraft(path, outcome.reason)
		return 'done'
	}
	adoptDiskText(path, outcome.text)
	return 'done'
}

export async function openFromDisk(path: string, alive: () => boolean = () => true): Promise<'dirty' | 'done'> {
	try {
		return await readIfOpenable(path, alive)
	} catch (err) {
		if (!alive()) return 'done'
		if (isPathDirty(path)) return 'dirty'
		blockDraft(path, err instanceof FsError && err.code === 'NOT_FOUND' ? '文件已删除' : messageOf(err))
		return 'done'
	}
}

export async function reloadClean(path: string) {
	const result = await openFromDisk(path)
	if (result !== 'dirty') return
	const slot = slots.get(path)
	if (!slot) return
	slot.notice = '磁盘已变化'
	emit()
}

export async function applyRemote(path: string, changes: readonly FsChange[]) {
	const action = openFileDiskAction(isPathDirty(path), eventsForOpenPath(path, changes))
	if (action === 'keep') return
	if (action === 'notice') {
		const slot = slots.get(path)
		if (slot) {
			slot.notice = '磁盘已变化'
			emit()
		}
		return
	}
	if (action === 'gone') {
		blockDraft(path, '文件已删除')
		return
	}
	await reloadClean(path)
}

export function flushDraft(path: string): Promise<void> {
	const slot = slots.get(path)
	if (!slot || slot.blocked) return Promise.resolve()
	clearTimer(path)
	if (slot.clock.draft === slot.clock.saved && !slot.clock.writing) return Promise.resolve()
	if (slot.clock.writing === slot.clock.draft) {
		return (chains.get(path) ?? Promise.resolve()).then(() => {
			const current = slots.get(path)
			if (!current || current.error || current.blocked) return
			if (current.clock.draft !== current.clock.saved) return flushDraft(path)
		})
	}
	return enqueue(path, slot.clock.draft).then(() => {
		clearTimer(path)
		const current = slots.get(path)
		if (!current || current.error || current.blocked) return
		if (current.clock.draft !== current.clock.saved) return flushDraft(path)
	})
}

export async function flushAndDrop(path: string) {
	await flushDraft(path)
	const slot = slots.get(path)
	if (!slot || slot.error || isDraftDirty(slot.clock)) return
	clearTimer(path)
	slots.delete(path)
	emit()
}
