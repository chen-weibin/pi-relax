import classNames from 'classnames'
import { useId, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Heading } from './Heading'
import { Modal } from './Modal'

export type DialogTask = () => void | Promise<void>

export type DialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	title?: ReactNode
	body?: ReactNode
	/** Click the backdrop to close. Default `true`. Ignored while a task is running. */
	closeOnBackdrop?: boolean
	/** Escape to close. Default `true`. Ignored while a task is running. */
	closeOnEscape?: boolean
	/** Show the cancel button. Default `true`. */
	showCancel?: boolean
	cancelText?: string
	confirmText?: string
	/** Called for confirm. A returned promise keeps the dialog open until it settles. */
	onOk?: DialogTask
	/** Called for cancel, Escape, and the backdrop. Same wait rules as `onOk`. */
	onCancel?: DialogTask
}

function isPromise(value: unknown): value is Promise<unknown> {
	return typeof value === 'object' && value !== null && typeof (value as { then?: unknown }).then === 'function'
}

export function Dialog({
	open,
	onOpenChange,
	title,
	body,
	closeOnBackdrop = true,
	closeOnEscape = true,
	showCancel = true,
	cancelText = '取消',
	confirmText = '确认',
	onOk,
	onCancel,
}: DialogProps) {
	const titleId = useId()
	const pending = useRef<'ok' | 'cancel' | null>(null)
	const [busy, setBusy] = useState<'ok' | 'cancel' | null>(null)
	const locked = busy !== null

	async function run(kind: 'ok' | 'cancel') {
		if (pending.current) return
		const task = kind === 'ok' ? onOk : onCancel
		if (!task) {
			onOpenChange(false)
			return
		}
		let result: void | Promise<void>
		try {
			result = task()
		} catch (error) {
			console.error(error)
			onOpenChange(false)
			return
		}
		if (!isPromise(result)) {
			onOpenChange(false)
			return
		}
		pending.current = kind
		setBusy(kind)
		try {
			await result
		} catch (error) {
			console.error(error)
		} finally {
			pending.current = null
			setBusy(null)
			onOpenChange(false)
		}
	}

	const hasTitle = title !== undefined && title !== null && title !== false && title !== ''

	return (
		<Modal
			open={open}
			onOpenChange={(next) => {
				if (!next) void run('cancel')
			}}
			closeOnBackdrop={closeOnBackdrop && !locked}
			closeOnEscape={closeOnEscape && !locked}
			className="w-full max-w-[360px] p-4"
			{...(hasTitle ? { 'aria-labelledby': titleId } : {})}
		>
			{hasTitle ? <Heading id={titleId}>{title}</Heading> : null}
			{body !== undefined && body !== null && body !== false && body !== '' ? (
				<div className={classNames('text-sm text-fg-3', hasTitle && 'mt-1')}>{body}</div>
			) : null}
			<div className="mt-4 flex justify-end gap-2">
				{showCancel ? (
					<Button
						type="button"
						variant="ghost"
						loading={busy === 'cancel'}
						disabled={locked && busy !== 'cancel'}
						onClick={() => void run('cancel')}
					>
						{cancelText}
					</Button>
				) : null}
				<Button
					type="button"
					tone="inverse"
					loading={busy === 'ok'}
					disabled={locked && busy !== 'ok'}
					onClick={() => void run('ok')}
				>
					{confirmText}
				</Button>
			</div>
		</Modal>
	)
}
