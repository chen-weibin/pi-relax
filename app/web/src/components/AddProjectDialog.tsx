import { useEffect, useId, useState } from 'react'
import { ApiError } from '../api/http'
import { registerProjectDirectory } from '../session'
import { Button } from '../ui/Button'
import { Heading } from '../ui/Heading'
import { Hint } from '../ui/Hint'
import { Input } from '../ui/Input'
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
			const message = caught instanceof ApiError ? caught.message : '添加失败'
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
				<Heading id={titleId}>添加工作目录</Heading>
				<Hint className="mt-1">请自己复制目录的绝对路径，例如 /Users/xxx/project</Hint>
				<Input
					autoFocus
					allowClear
					variant="transparent"
					className="mt-3"
					value={path}
					disabled={pending}
					placeholder="/Users/xxx/project"
					status={error ? 'error' : undefined}
					hint={error ?? undefined}
					hintReserve={error != null}
					onChange={setPath}
				/>
				<div className="mt-4 flex justify-end gap-2">
					<Button type="button" variant="ghost" onClick={onClose}>
						取消
					</Button>
					<Button type="submit" tone="inverse" disabled={pending}>
						{pending ? '添加中' : '确定'}
					</Button>
				</div>
			</form>
		</Modal>
	)
}
