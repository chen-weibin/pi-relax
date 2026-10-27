import { MonacoEditor } from '../ui/MonacoEditor'
import { Preview } from './frame'

const sample = `function hello() {
  return 'ui'
}
`

function MonacoEditorDemo() {
	return (
		<Preview label="只读" bodyClassName="p-0">
			<MonacoEditor value={sample} language="typescript" readOnly className="h-40 w-full" />
		</Preview>
	)
}

export const monacoEditorDoc = {
	id: 'monaco-editor',
	heading: 'MonacoEditor',
	description: '只读代码文本，主题和 worker 已在组件里接好。',
	nav: ['MonacoEditor'],
	Demo: MonacoEditorDemo,
}
