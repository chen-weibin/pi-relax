import { useEffect, useState } from 'react'
import { mockFs } from '../../contracts/adapters/mock'
import { resolveFileKind } from './fileKinds'
import type { FilesFilePayload } from './open'
import { FileViewer } from './viewers'

export function FilePreview({ payload }: { payload: FilesFilePayload }) {
	const [text, setText] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const kind = resolveFileKind(payload.path)

	useEffect(() => {
		let cancelled = false
		setText(null)
		setError(null)
		void mockFs.read(payload.path).then(
			(result) => {
				if (!cancelled) setText(result.text)
			},
			() => {
				if (!cancelled) setError('无法读取（mock FsApi）')
			},
		)
		return () => {
			cancelled = true
		}
	}, [payload.path])

	if (error) {
		return <div className="p-3 text-sm text-fg-3">{error}</div>
	}

	if (text === null) {
		return <div className="p-3 text-sm text-fg-3">加载中…</div>
	}

	return <FileViewer path={payload.path} text={text} kind={kind} />
}
