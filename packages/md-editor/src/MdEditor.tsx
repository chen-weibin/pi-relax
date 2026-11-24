import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import { EditorCore } from './editor/EditorCore'
import type { Keybindings } from './editor/plugins/keymap'
import type { DocJson } from './editor/types'
import './styles/base.css'

export type MdEditorTheme = 'light'

const defaultPlaceholder = '请输入...'

export function MdEditor({
	theme = 'light',
	placeholder = defaultPlaceholder,
	value,
	onChange,
	keybindings,
}: {
	theme?: MdEditorTheme
	placeholder?: string
	value?: DocJson
	onChange?: (value: DocJson) => void
	keybindings?: Keybindings
}) {
	const mountRef = useRef<HTMLDivElement>(null)
	const editorRef = useRef<EditorCore | null>(null)
	const onChangeRef = useRef(onChange)
	const echoedRef = useRef(value)
	const initialValueRef = useRef(value)
	const keybindingsRef = useRef(keybindings)

	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	useEffect(() => {
		const mount = mountRef.current
		if (!mount) return
		const editor = new EditorCore({
			mount,
			initialValue: initialValueRef.current,
			keybindings: keybindingsRef.current,
			onChange: (next) => {
				echoedRef.current = next
				onChangeRef.current?.(next)
			},
		})
		editorRef.current = editor
		return () => {
			editor.destroy()
			editorRef.current = null
		}
	}, [])

	useEffect(() => {
		if (value === undefined || value === echoedRef.current) return
		echoedRef.current = value
		editorRef.current?.setValue(value)
	}, [value])

	useEffect(() => {
		if (keybindings === keybindingsRef.current) return
		keybindingsRef.current = keybindings
		editorRef.current?.setKeybindings(keybindings)
	}, [keybindings])

	const style = { '--md-editor-placeholder': JSON.stringify(placeholder) } as CSSProperties

	return (
		<div className="min-h-4" data-theme={theme} style={style}>
			<div ref={mountRef} />
		</div>
	)
}
