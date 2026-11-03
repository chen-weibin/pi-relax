import classNames from 'classnames'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { MinusIcon, SendIcon, TrashIcon } from '../icons'
import type { PendingMessage } from '../session/pendingQueue'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Editor, type EditorHandle } from '../ui/Editor'
import { Hint } from '../ui/Hint'
import { Popover } from '../ui/Popover'

export type ComposerProps = {
	placeholder?: string
	disabled?: boolean
	generating?: boolean
	pending?: readonly PendingMessage[]
	notice?: string | null
	onSubmit?: (text: string) => void | Promise<void>
	onAbort?: () => void
	onSendNow?: (id: string) => void
	onRemove?: (id: string) => void
	accessory?: ReactNode
	className?: string
}

export function Composer({
	placeholder = '发送消息…',
	disabled = false,
	generating = false,
	pending = [],
	notice,
	onSubmit,
	onAbort,
	onSendNow,
	onRemove,
	accessory,
	className,
}: ComposerProps) {
	const editorRef = useRef<EditorHandle>(null)
	const shellRef = useRef<HTMLDivElement>(null)
	const [canSend, setCanSend] = useState(false)
	const [queueOpen, setQueueOpen] = useState(false)
	const [shellWidth, setShellWidth] = useState<number | undefined>(undefined)
	if (pending.length === 0 && queueOpen) setQueueOpen(false)
	const stop = generating && !canSend && !disabled
	const sendEnabled = canSend && !disabled
	const roundEnabled = stop || sendEnabled

	useLayoutEffect(() => {
		const node = shellRef.current
		if (!node) return
		const measure = () => setShellWidth(node.offsetWidth)
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(node)
		return () => observer.disconnect()
	}, [])

	const submit = (text: string) => {
		const trimmed = text.trim()
		if (!trimmed || disabled) return
		void Promise.resolve(onSubmit?.(trimmed)).then(
			() => {
				editorRef.current?.clear()
				editorRef.current?.focus()
				setCanSend(false)
			},
			() => {
				editorRef.current?.focus()
			},
		)
	}

	return (
		<div className={classNames('flex flex-col', className)}>
			{pending.length > 0 ? (
			<div className="mb-1.5 flex justify-end">
				<Popover
					placement="top-end"
					width={shellWidth || undefined}
					open={queueOpen}
					onOpenChange={setQueueOpen}
					className="flex max-h-60 flex-col bg-app! p-2"
					content={
						<>
							<div className="mb-2 flex shrink-0 items-center justify-between gap-2">
								<span className="flex items-center gap-1.5 text-sm text-fg">
									等待发送
									<span className="text-fg-3">{pending.length}</span>
								</span>
								<IconButton title="关闭" size="sm" onClick={() => setQueueOpen(false)}>
									<MinusIcon />
								</IconButton>
							</div>
							<div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto [overflow-y:overlay]">
								{pending.map((item) => (
									<div
										key={item.id}
										className="group relative flex h-8 shrink-0 items-center rounded-md px-2 hover:bg-surface-hover"
									>
										<span className="min-w-0 flex-1 truncate group-hover:pr-24">{item.text}</span>
										<span className="pointer-events-none absolute inset-y-0 right-1 flex items-center opacity-0 group-hover:pointer-events-auto group-hover:opacity-100">
											<IconButton
												title="取消"
												size="sm"
												className="-mr-1"
												onClick={() => onRemove?.(item.id)}
											>
												<TrashIcon />
											</IconButton>
											<Button size="sm" variant="ghost" type="button" onClick={() => onSendNow?.(item.id)}>
												立刻发送
											</Button>
										</span>
									</div>
								))}
							</div>
						</>
					}
				>
					<Button size="md" variant="outline" type="button">
						消息队列
					</Button>
				</Popover>
			</div>
			) : null}
			<div
				ref={shellRef}
				className={classNames(
					'flex flex-col gap-2 rounded-pill border border-border-hover bg-[color-mix(in_srgb,var(--app)_45%,var(--surface))] px-3.5 pt-3 pb-2',
					'focus-within:border-[color-mix(in_srgb,var(--border-hover),var(--fg)_12%)]',
				)}
			>
				<Editor
					ref={editorRef}
					placeholder={placeholder}
					disabled={disabled}
					onChange={(text) => setCanSend(text.trim().length > 0)}
					onSubmit={submit}
				/>
				<div className="flex items-center justify-end gap-1">
					{accessory}
					<button
						type="button"
						title={stop ? '停止' : '发送'}
						aria-label={stop ? '停止' : '发送'}
						disabled={!roundEnabled}
						onClick={() => {
							if (stop) onAbort?.()
							else submit(editorRef.current?.getText() ?? '')
						}}
						className={classNames(
							'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-100',
							roundEnabled
								? 'cursor-pointer bg-fg text-app hover:bg-fg-bright'
								: 'cursor-default bg-surface-active text-fg-disabled',
						)}
					>
						{stop ? (
							<span className="block h-2.5 w-2.5 rounded-[2px] bg-current" />
						) : (
							<span className="inline-flex -translate-x-[0.5px]">
								<SendIcon />
							</span>
						)}
					</button>
				</div>
			</div>
			{notice ? (
				<Hint className="mt-1" color="error">
					{notice}
				</Hint>
			) : null}
		</div>
	)
}
