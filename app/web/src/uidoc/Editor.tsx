import { useRef, useState } from 'react'
import { Editor, type EditorHandle } from '../ui/Editor'
import { Preview } from './frame'

function EditorDemo() {
	const editorRef = useRef<EditorHandle>(null)
	const [submitted, setSubmitted] = useState('')
	return (
		<Preview label="Enter 提交" bodyClassName="flex-col items-stretch gap-3">
			<div className="w-full rounded-md border border-border-hover px-3 py-2">
				<Editor
					ref={editorRef}
					placeholder="输入内容，Enter 提交"
					onSubmit={(text) => {
						setSubmitted(text)
						editorRef.current?.clear()
					}}
				/>
			</div>
			{submitted ? <p className="text-sm text-fg-3">已提交：{submitted}</p> : null}
		</Preview>
	)
}

export const editorDoc = {
	id: 'editor',
	heading: 'Editor',
	description: '富文本输入。Enter 提交这一行，Shift+Enter 换行。',
	nav: ['Editor'],
	Demo: EditorDemo,
}
