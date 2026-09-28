import Editor from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import { ensureMonacoTheme, MONACO_THEME } from './env'

export type MonacoEditorProps = {
	value: string
	language?: string
	path?: string
	readOnly?: boolean
	className?: string
}

export function MonacoEditor({
	value,
	language = 'plaintext',
	path,
	readOnly = true,
	className,
}: MonacoEditorProps) {
	const [ready, setReady] = useState(false)
	useEffect(() => {
		let cancelled = false
		ensureMonacoTheme().then(() => {
			if (!cancelled) setReady(true)
		})
		return () => {
			cancelled = true
		}
	}, [])

	const frame = className ?? 'h-full min-h-0 w-full'
	if (!ready) {
		return (
			<div className={frame}>
				<div className="p-3 text-sm text-fg-3">加载编辑器…</div>
			</div>
		)
	}

	return (
		<div className={frame}>
			<Editor
				path={path}
				value={value}
				language={language}
				theme={MONACO_THEME}
				options={{
					readOnly,
					domReadOnly: readOnly,
					'semanticHighlighting.enabled': false,
					minimap: { enabled: true, side: 'right', showSlider: 'mouseover' },
					scrollBeyondLastLine: false,
					fontSize: 13,
					lineHeight: 22,
					padding: { top: 12, bottom: 12 },
					automaticLayout: true,
					wordWrap: 'on',
					renderLineHighlight: 'none',
					overviewRulerLanes: 0,
					hideCursorInOverviewRuler: true,
					scrollbar: {
						verticalScrollbarSize: 8,
						horizontalScrollbarSize: 8,
					},
					contextmenu: false,
					smoothScrolling: true,
				}}
				loading={<div className="p-3 text-sm text-fg-3">加载编辑器…</div>}
			/>
		</div>
	)
}
