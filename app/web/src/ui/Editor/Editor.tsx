import classNames from 'classnames'
import { history } from 'prosemirror-history'
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
} from 'react'
import './editor.css'
import { createEditorKeymap } from './keymap'
import { placeholderPlugin } from './placeholder'
import { schema } from './schema'
import { docToText, textToDoc } from './serialize'

export type EditorHandle = {
	focus: () => void
	clear: () => void
	getText: () => string
}

export type EditorProps = {
	placeholder?: string
	disabled?: boolean
	autoFocus?: boolean
	className?: string
	onChange?: (text: string) => void
	/** Enter (no Shift); blank text is not forwarded. Caller clears via ref. */
	onSubmit?: (text: string) => void
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
	{
		placeholder = '',
		disabled = false,
		autoFocus = false,
		className,
		onChange,
		onSubmit,
	},
	ref,
) {
	const mountRef = useRef<HTMLDivElement>(null)
	const viewRef = useRef<EditorView | null>(null)
	const callbacksRef = useRef({ onChange, onSubmit, placeholder })
	callbacksRef.current = { onChange, onSubmit, placeholder }

	useImperativeHandle(ref, () => ({
		focus() {
			viewRef.current?.focus()
		},
		clear() {
			const view = viewRef.current
			if (!view) return
			const empty = textToDoc('')
			const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, empty.content)
			tr.setSelection(TextSelection.create(tr.doc, 1))
			view.dispatch(tr)
		},
		getText() {
			const view = viewRef.current
			return view ? docToText(view.state.doc) : ''
		},
	}))

	useLayoutEffect(() => {
		const mount = mountRef.current
		if (!mount) return

		const state = EditorState.create({
			schema,
			doc: textToDoc(''),
			plugins: [
				history(),
				...createEditorKeymap(() => callbacksRef.current.onSubmit),
				placeholderPlugin(() => callbacksRef.current.placeholder),
			],
		})

		const view = new EditorView(mount, {
			state,
			editable: () => !disabled,
			attributes: {
				class: 'pm-editor',
				role: 'textbox',
				'aria-multiline': 'true',
			},
			dispatchTransaction(tr) {
				const next = view.state.apply(tr)
				view.updateState(next)
				if (tr.docChanged) {
					callbacksRef.current.onChange?.(docToText(next.doc))
				}
			},
		})

		viewRef.current = view
		if (autoFocus) view.focus()

		return () => {
			view.destroy()
			viewRef.current = null
		}
		// Mount once; disabled / callbacks via refs & setProps.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		const view = viewRef.current
		if (!view) return
		view.setProps({ editable: () => !disabled })
	}, [disabled])

	return (
		<div
			ref={mountRef}
			className={classNames('min-w-0 flex-1', className)}
		/>
	)
})
