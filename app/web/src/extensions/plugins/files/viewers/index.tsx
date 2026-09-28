import { MonacoEditor } from '../../../../ui/MonacoEditor'
import type { FileKind } from '../fileKinds'

export function FileViewer({
	path,
	text,
	kind,
}: {
	path: string
	text: string
	kind: FileKind
}) {
	if (kind.viewer === 'monaco') {
		return (
			<MonacoEditor
				path={path}
				value={text}
				language={kind.language ?? 'plaintext'}
				readOnly
			/>
		)
	}

	return <div className="p-3 text-sm text-fg-3">暂不支持此文件类型</div>
}
