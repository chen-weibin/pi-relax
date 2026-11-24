import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import { EditorCore } from './editor/EditorCore'
import type { Keybindings, MdEditorMode } from './editor/plugins/keymap'
import type { DocJson } from './editor/types'
import { themeStyleVars, type MdEditorTheme, type MdEditorThemes } from './theme'
import './styles/base.css'

const defaultPlaceholder = '请输入...'

export function MdEditor({
	theme = 'light',
	themes,
	mode = 'edit',
	placeholder = defaultPlaceholder,
	value,
	onChange,
	keybindings,
	className,
	style,
}: {
	theme?: MdEditorTheme
	themes?: MdEditorThemes
	mode?: MdEditorMode
	placeholder?: string
	value?: DocJson
	onChange?: (value: DocJson) => void
	keybindings?: Keybindings
	className?: string
	style?: CSSProperties
}) {
	const mountRef = useRef<HTMLDivElement>(null)
	const editorRef = useRef<EditorCore | null>(null)
	const onChangeRef = useRef(onChange)
	const echoedRef = useRef(value)
	const initialValueRef = useRef(value)
	const keybindingsRef = useRef(keybindings)
	const modeRef = useRef(mode)

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
			mode: modeRef.current,
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

	useEffect(() => {
		if (mode === modeRef.current) return
		modeRef.current = mode
		editorRef.current?.setMode(mode)
	}, [mode])

	const shellStyle = {
		'--md-editor-placeholder': JSON.stringify(placeholder),
		...themeStyleVars(themes?.[theme]),
		...style,
	} as CSSProperties

	return (
		<div
			className={['flex min-h-full flex-col', className].filter(Boolean).join(' ')}
			data-theme={theme}
			style={shellStyle}
		>
			<div ref={mountRef} className="flex min-h-full flex-1 flex-col [&_.mded]:flex-1" />
		</div>
	)
}
