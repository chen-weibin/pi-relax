import { useEffect, useSyncExternalStore } from 'react'
import { EmptyState } from '../../../ui/EmptyState'
import {
	editDraft,
	getDraft,
	getDraftVersion,
	isPathDirty,
	openFromDisk,
	subscribeDrafts,
} from './drafts'
import type { FilesFilePayload } from './open'
import { resolveFileKind } from './fileKinds'
import { FileViewer } from './viewers'

export function FilePreview({ payload }: { payload: FilesFilePayload }) {
	const path = payload.path
	useSyncExternalStore(subscribeDrafts, getDraftVersion)
	const draft = getDraft(path)
	const kind = resolveFileKind(path)
	const Icon = kind.icon

	useEffect(() => {
		let cancelled = false
		if (getDraft(path)?.blocked) return
		if (isPathDirty(path)) return
		void openFromDisk(path, () => !cancelled)
		return () => {
			cancelled = true
		}
	}, [path])

	if (!draft) {
		return <EmptyState icon={<Icon />}>加载中…</EmptyState>
	}
	if (draft.blocked) {
		return <EmptyState icon={<Icon />}>{draft.blocked}</EmptyState>
	}

	const editable = kind.open === 'text' && kind.viewer === 'monaco'

	return (
		<div className="flex h-full min-h-0 flex-col">
			{draft.notice && <div className="px-3 py-1.5 text-xs text-fg-3">{draft.notice}</div>}
			{draft.error && <div className="px-3 py-1.5 text-xs text-error">{draft.error}</div>}
			<div className="min-h-0 flex-1">
				<FileViewer
					path={path}
					text={draft.clock.draft}
					kind={kind}
					onChange={editable ? (value) => editDraft(path, value) : undefined}
				/>
			</div>
		</div>
	)
}
