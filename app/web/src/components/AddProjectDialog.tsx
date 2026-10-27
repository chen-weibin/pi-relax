import { useEffect, useId, useState } from 'react'
import { ApiError } from '../api/http'
import { registerProjectDirectory } from '../session'
import { Modal } from '../ui/Modal'

export function AddProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const titleId = useId()
	const [path, setPath] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	useEffect(() => {
		if (!open) return
		setPath('')
		setError(null)
		setPending(false)
	}, [open])

	async function submit() {
		const cwd = path.trim()
		if (!cwd) {
			setError('请输入绝对路径')
			return
		}
		setPending(true)
		setError(null)
		try {
			await registerProjectDirectory(cwd)
			onClose()
		} catch (caught) {
			const message = caught instanceof ApiError ? caught.message : '登记失败'
			setError(message)
			setPending(false)
		}
	}

	return (
		<Modal
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose()
			}}
			className="w-full max-w-[360px] p-4"
			aria-labelledby={titleId}
		>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					void submit()
				}}
			>
				<h2 id={titleId} className="text-sm text-fg">
					添加项目
				</h2>
				<p className="mt-1 text-xs text-fg-3">请自己复制目录的绝对路径，例如 /Users/xxx/project</p>
				<input
					autoFocus
					value={path}
					disabled={pending}
					placeholder="/Users/xxx/project"
					onChange={(event) => setPath(event.target.value)}
					className="mt-3 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-fg-disabled"
				/>
				{error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
				<div className="mt-4 flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="cursor-pointer rounded-md px-2.5 py-1 text-sm text-fg-2 hover:bg-surface-hover"
					>
						取消
					</button>
					<button
						type="submit"
						disabled={pending}
						className="cursor-pointer rounded-md bg-surface-active px-2.5 py-1 text-sm text-fg disabled:opacity-50"
					>
						{pending ? '登记中' : '登记'}
					</button>
				</div>
			</form>
		</Modal>
	)
}
