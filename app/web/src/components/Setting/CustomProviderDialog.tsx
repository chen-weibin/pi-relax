import { useEffect, useId, useState } from 'react'
import { ApiError } from '../../api/http'
import {
	createCustomProvider,
	updateCustomProvider,
	type CustomProvider,
	type CustomProviderMeta,
} from '../../api/custom-providers'
import { Button } from '../../ui/Button'
import { Heading } from '../../ui/Heading'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import { Switch } from '../../ui/Switch'
import '../../styles/scrollbar.css'
import {
	customProviderPayload,
	draftFromProvider,
	emptyModelDraft,
	emptyProviderDraft,
	type CustomModelDraft,
	type CustomProviderDraft,
} from './customProviderForm'

export function CustomProviderDialog({
	open,
	provider,
	meta,
	onClose,
	onSaved,
}: {
	open: boolean
	provider: CustomProvider | null
	meta: CustomProviderMeta
	onClose: () => void
	onSaved: () => Promise<void>
}) {
	const titleId = useId()
	const editing = provider !== null
	const [draft, setDraft] = useState<CustomProviderDraft>(() => emptyProviderDraft(meta.defaults.api))
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	useEffect(() => {
		if (!open) return
		setDraft(provider ? draftFromProvider(provider) : emptyProviderDraft(meta.defaults.api))
		setError(null)
		setPending(false)
	}, [open, provider, meta.defaults.api])

	function patch(partial: Partial<CustomProviderDraft>) {
		setDraft((current) => ({ ...current, ...partial }))
	}

	function patchModel(index: number, partial: Partial<CustomModelDraft>) {
		setDraft((current) => ({
			...current,
			models: current.models.map((model, i) => (i === index ? { ...model, ...partial } : model)),
		}))
	}

	async function submit() {
		const parsed = customProviderPayload(draft, editing ? 'update' : 'create')
		if (!parsed.ok) {
			setError(parsed.error)
			return
		}
		setPending(true)
		setError(null)
		try {
			if (editing && provider) await updateCustomProvider(provider.id, parsed.body)
			else await createCustomProvider(parsed.body)
			await onSaved()
			onClose()
		} catch (caught) {
			setError(caught instanceof ApiError ? caught.message : '保存失败')
			setPending(false)
		}
	}

	return (
		<Modal
			open={open}
			onOpenChange={(next) => {
				if (!next && !pending) onClose()
			}}
			closeOnBackdrop={!pending}
			closeOnEscape={!pending}
			align="top"
			className="flex max-h-[calc(100vh-120px)] w-full max-w-[520px] flex-col p-4"
			aria-labelledby={titleId}
		>
			<form
				className="flex min-h-0 flex-col"
				onSubmit={(event) => {
					event.preventDefault()
					void submit()
				}}
			>
				<Heading id={titleId}>{editing ? '编辑自定义提供商' : '添加自定义提供商'}</Heading>
				<div className="scrollbar-none mt-3 flex min-h-0 flex-col gap-3 overflow-y-auto">
					<label className="flex flex-col gap-1">
						<span className="text-sm text-fg-3">标识</span>
						<Input
							value={draft.id}
							disabled={editing || pending}
							placeholder="ollama"
							onChange={(value) => patch({ id: value })}
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-sm text-fg-3">显示名</span>
						<Input
							value={draft.name}
							disabled={pending}
							placeholder="可选"
							onChange={(value) => patch({ name: value })}
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-sm text-fg-3">Base URL</span>
						<Input
							value={draft.baseUrl}
							disabled={pending}
							placeholder="http://localhost:11434/v1"
							onChange={(value) => patch({ baseUrl: value })}
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-sm text-fg-3">接口</span>
						<select
							className="h-[30px] rounded-md border border-border-hover bg-surface px-2.5 text-md text-fg outline-none"
							value={draft.api}
							disabled={pending}
							onChange={(event) => patch({ api: event.target.value })}
						>
							{meta.apis.map((api) => (
								<option key={api} value={api}>
									{api}
								</option>
							))}
						</select>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-sm text-fg-3">API Key</span>
						<Input
							type="password"
							value={draft.apiKey}
							disabled={pending}
							placeholder={editing ? '留空则保留原密钥' : '必填'}
							onChange={(value) => patch({ apiKey: value })}
						/>
					</label>
					<div className="flex items-center justify-between">
						<span className="text-sm text-fg-3">模型</span>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							disabled={pending}
							onClick={() => patch({ models: [...draft.models, emptyModelDraft()] })}
						>
							添加模型
						</Button>
					</div>
					{draft.models.map((model, index) => (
						<div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-fg-2">模型 {index + 1}</span>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									disabled={pending}
									onClick={() => patch({ models: draft.models.filter((_, i) => i !== index) })}
								>
									移除
								</Button>
							</div>
							<Input
								value={model.id}
								disabled={pending}
								placeholder="模型 id"
								onChange={(value) => patchModel(index, { id: value })}
							/>
							<Input
								value={model.name}
								disabled={pending}
								placeholder="显示名，可选"
								onChange={(value) => patchModel(index, { name: value })}
							/>
							<div className="flex items-center justify-between">
								<span className="text-sm text-fg-3">推理</span>
								<Switch
									checked={model.reasoning}
									disabled={pending}
									ariaLabel="推理"
									onChange={(reasoning) => patchModel(index, { reasoning })}
								/>
							</div>
							<Input
								value={model.contextWindow}
								disabled={pending}
								inputMode="numeric"
								placeholder="上下文窗口"
								hint={`留空时基座默认约 ${meta.defaults.contextWindow}`}
								hintReserve
								onChange={(value) => patchModel(index, { contextWindow: value })}
							/>
							<Input
								value={model.maxTokens}
								disabled={pending}
								inputMode="numeric"
								placeholder="最大输出"
								hint={`留空时基座默认约 ${meta.defaults.maxTokens}`}
								hintReserve
								onChange={(value) => patchModel(index, { maxTokens: value })}
							/>
						</div>
					))}
				</div>
				{error ? <div className="mt-3 text-sm text-error">{error}</div> : null}
				<div className="mt-4 flex justify-end gap-2">
					<Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
						取消
					</Button>
					<Button type="submit" tone="inverse" loading={pending}>
						保存
					</Button>
				</div>
			</form>
		</Modal>
	)
}
