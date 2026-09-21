import { useEffect, useState } from 'react'
import { ChevronRightIcon } from '../../../icons'
import { mockFs } from '../../contracts/adapters/mock'
import type { FilesFilePayload } from './open'

export function FilePreview({ payload }: { payload: FilesFilePayload }) {
	const [text, setText] = useState('加载中…')
	const parts = payload.path.split('/').filter(Boolean)

	useEffect(() => {
		let cancelled = false
		void mockFs.read(payload.path).then(
			(result) => {
				if (!cancelled) setText(result.text)
			},
			() => {
				if (!cancelled) setText('无法读取（mock FsApi）')
			},
		)
		return () => {
			cancelled = true
		}
	}, [payload.path])

	return (
		<div className="flex h-full min-w-0 flex-col">
			<div className="flex h-9 shrink-0 items-center gap-1 overflow-hidden border-b border-border px-3 text-xs text-fg-3">
				{parts.map((part, index) => (
					<span key={`${part}-${index}`} className="flex min-w-0 shrink items-center gap-1">
						{index > 0 && (
							<span className="inline-flex h-2.5 w-2.5 shrink-0 [&_svg]:h-2.5 [&_svg]:w-2.5">
								<ChevronRightIcon />
							</span>
						)}
						<span
							className={
								index === parts.length - 1
									? 'shrink-0 text-fg-2'
									: 'min-w-0 truncate'
							}
						>
							{part}
						</span>
					</span>
				))}
			</div>
			<pre className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-sm leading-6 text-fg-2">
				{text}
			</pre>
		</div>
	)
}
