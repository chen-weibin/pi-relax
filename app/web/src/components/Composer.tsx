import classNames from 'classnames'
import { useRef, useState } from 'react'
import { SendIcon } from '../icons'
import { Editor, type EditorHandle } from '../ui/Editor'

export type ComposerProps = {
	placeholder?: string
	disabled?: boolean
	onSubmit?: (text: string) => void
	className?: string
}

export function Composer({
	placeholder = '发送消息…',
	disabled = false,
	onSubmit,
	className,
}: ComposerProps) {
	const editorRef = useRef<EditorHandle>(null)
	const [canSend, setCanSend] = useState(false)

	const submit = (text: string) => {
		const trimmed = text.trim()
		if (!trimmed || disabled) return
		onSubmit?.(trimmed)
		editorRef.current?.clear()
		editorRef.current?.focus()
		setCanSend(false)
	}

	const sendEnabled = canSend && !disabled

	return (
		<div
			className={classNames(
				'flex flex-col gap-2 rounded-pill border border-border-hover bg-[color-mix(in_srgb,var(--app)_45%,var(--surface))] px-3.5 pt-3 pb-2',
				'focus-within:border-[color-mix(in_srgb,var(--border-hover),var(--fg)_12%)]',
				className,
			)}
		>
			<Editor
				ref={editorRef}
				placeholder={placeholder}
				disabled={disabled}
				onChange={(text) => setCanSend(text.trim().length > 0)}
				onSubmit={submit}
			/>
			<div className="flex justify-end">
				<button
					type="button"
					title="发送"
					aria-label="发送"
					disabled={!sendEnabled}
					onClick={() => submit(editorRef.current?.getText() ?? '')}
					className={classNames(
						'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-100',
						sendEnabled
							? 'cursor-pointer bg-fg text-app hover:bg-fg-bright'
							: 'cursor-default bg-surface-active text-fg-disabled',
					)}
				>
					<span className="inline-flex -translate-x-[0.5px]">
						<SendIcon />
					</span>
				</button>
			</div>
		</div>
	)
}
