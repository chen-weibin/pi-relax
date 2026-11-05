import { useEffect, useSyncExternalStore } from 'react'
import { fsApi } from '../../contracts/adapters/fsHttp'
import { FsError } from '../../contracts/fs'
import {
	adoptDiskText,
	blockDraft,
	editDraft,
	getDraft,
	getDraftVersion,
	isPathDirty,
	subscribeDrafts,
} from './drafts'
import type { FilesFilePayload } from './open'
import { resolveFileKind } from './fileKinds'
import { FileViewer } from './viewers'

export function FilePreview({ payload }: { payload: FilesFilePayload }) {
	const path = payload.path
	useSyncExternalStore(subscribeDrafts, getDraftVersion)
	const draft = getDraft(path)

	useEffect(() => {
		let cancelled = false
		if (getDraft(path)?.blocked) return
		if (isPathDirty(path)) return
		void fsApi.read(path).then(
			(outcome) => {
				if (cancelled || isPathDirty(path)) return
				if (outcome.kind === 'blocked') {
					blockDraft(path, outcome.reason)
					return
				}
				adoptDiskText(path, outcome.text)
			},
			(err: unknown) => {
				if (cancelled || isPathDirty(path)) return
				const reason = err instanceof FsError && err.code === 'NOT_FOUND' ? '文件已删除' : err instanceof Error ? err.message : '无法读取'
				blockDraft(path, reason)
			},
		)
		return () => {
			cancelled = true
		}
	}, [path])

	if (!draft) {
		return <div className="p-3 text-sm text-fg-3">加载中…</div>
	}
	if (draft.blocked) {
		return <div className="p-3 text-sm text-fg-3">{draft.blocked}</div>
	}

	const kind = resolveFileKind(path)
	const editable = kind.viewer === 'monaco'

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
