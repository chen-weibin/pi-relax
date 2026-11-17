import { useCallback, useEffect, useId, useState } from 'react'
import { ApiError } from '../../api/http'
import {
	getDefaultModel,
	listModels,
	putDefaultModel,
	refreshModels,
	type DefaultModel,
	type ModelSummary,
} from '../../api/models'
import {
	deleteCustomProvider,
	getCustomProviderMeta,
	listCustomProviders,
	type CustomProvider,
	type CustomProviderMeta,
} from '../../api/custom-providers'
import { deleteProviderKey, listProviders, putProviderKey, type ProviderSummary } from '../../api/providers'
import { startModelList } from '../../session/modelPicker'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Heading } from '../../ui/Heading'
import { Input } from '../../ui/Input'
import { message } from '../../ui/Message'
import { Modal } from '../../ui/Modal'
import { Select, type SelectOption } from '../../ui/Select'
import { SettingGroup } from '../../ui/SettingGroup'
import { SettingRow } from '../../ui/SettingRow'
import { CustomProviderDialog } from './CustomProviderDialog'

type PageData = {
	models: ModelSummary[]
	defaultModel: DefaultModel | null
	providers: ProviderSummary[]
	custom: CustomProvider[]
	meta: CustomProviderMeta
}

const FALLBACK_META: CustomProviderMeta = {
	apis: ['openai-completions'],
	defaults: { api: 'openai-completions', contextWindow: 128000, maxTokens: 16384 },
}

function modelKey(provider: string, id: string) {
	return `${provider}\t${id}`
}

function fail(error: unknown, fallback: string) {
	message.error(error instanceof Error ? error.message : fallback)
}

function modelNames(models: ModelSummary[]) {
	return models.length === 0 ? '无可用模型' : models.map((model) => model.name).join('、')
}

export function Models() {
	const [data, setData] = useState<PageData | null>(null)
	const [loading, setLoading] = useState(true)
	const [savingDefault, setSavingDefault] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [selectedBuiltinId, setSelectedBuiltinId] = useState<string | undefined>()
	const [editingKey, setEditingKey] = useState(false)
	const [keyDraft, setKeyDraft] = useState('')
	const [savingKey, setSavingKey] = useState(false)
	const [clearTarget, setClearTarget] = useState<ProviderSummary | null>(null)
	const [keyTarget, setKeyTarget] = useState<ProviderSummary | null>(null)
	const [formProvider, setFormProvider] = useState<CustomProvider | null>(null)
	const [formOpen, setFormOpen] = useState(false)
	const [deleteTarget, setDeleteTarget] = useState<CustomProvider | null>(null)

	const reload = useCallback(async () => {
		const [listed, defaults, providers, custom, meta] = await Promise.all([
			listModels(),
			getDefaultModel(),
			listProviders(),
			listCustomProviders(),
			getCustomProviderMeta(),
		])
		setData({
			models: listed.models,
			defaultModel: defaults.model,
			providers,
			custom,
			meta,
		})
	}, [])

	useEffect(() => {
		let dead = false
		void reload()
			.catch((error) => {
				if (!dead) fail(error, '加载模型设置失败')
			})
			.finally(() => {
				if (!dead) setLoading(false)
			})
		return () => {
			dead = true
		}
	}, [reload])

	async function reloadAndPublish() {
		try {
			await reload()
		} finally {
			startModelList()
		}
	}

	async function changeDefault(value: string) {
		const splitAt = value.indexOf('\t')
		if (splitAt <= 0) return
		setSavingDefault(true)
		try {
			const saved = await putDefaultModel(value.slice(0, splitAt), value.slice(splitAt + 1))
			setData((current) => (current ? { ...current, defaultModel: saved.model } : current))
			startModelList()
		} catch (error) {
			fail(error, '保存默认模型失败')
		} finally {
			setSavingDefault(false)
		}
	}

	async function refreshCatalog() {
		setRefreshing(true)
		try {
			const result = await refreshModels()
			const failed = result.providers.filter((row) => !row.ok)
			if (failed.length > 0) {
				message.error(`模型列表刷新失败：${failed.map((row) => row.id).join('、')}`)
			}
			await reloadAndPublish()
		} catch (error) {
			fail(error, '刷新模型列表失败')
		} finally {
			setRefreshing(false)
		}
	}

	async function saveKey() {
		if (!selectedBuiltinId) return
		const apiKey = keyDraft.trim()
		if (!apiKey) {
			message.error('请填写 API Key')
			return
		}
		setSavingKey(true)
		try {
			await putProviderKey(selectedBuiltinId, apiKey)
			setKeyDraft('')
			setEditingKey(false)
			await reloadAndPublish()
		} catch (error) {
			fail(error, '保存密钥失败')
		} finally {
			setSavingKey(false)
		}
	}

	async function clearKey() {
		if (!clearTarget) return
		try {
			await deleteProviderKey(clearTarget.id)
			setKeyDraft('')
			setEditingKey(false)
			await reloadAndPublish()
		} catch (error) {
			fail(error, '清除密钥失败')
		}
	}

	async function removeCustom() {
		if (!deleteTarget) return
		try {
			await deleteCustomProvider(deleteTarget.id)
			await reloadAndPublish()
		} catch (error) {
			fail(error, '移除自定义提供商失败')
		}
	}

	const models = data?.models ?? []
	const providers = data?.providers ?? []
	const builtin = providers.filter((provider) => provider.kind === 'builtin')
	const configuredBuiltin = builtin.filter((provider) => provider.configured)
	const custom = data?.custom ?? []
	const configuredCustom = custom.filter((provider) => provider.apiKeySet)
	const meta = data?.meta ?? FALLBACK_META
	const names = new Map(providers.map((provider) => [provider.id, provider.name]))
	const selectedBuiltin = builtin.find((provider) => provider.id === selectedBuiltinId)
	const builtinOptions: SelectOption<string>[] = builtin.map((provider) => ({
		value: provider.id,
		label: provider.configured ? `${provider.name}（已配置）` : provider.name,
	}))

	function providerModels(providerId: string) {
		return models.filter((model) => model.provider === providerId)
	}
	const options: SelectOption<string>[] = models.map((model) => ({
		value: modelKey(model.provider, model.id),
		label: `${names.get(model.provider) ?? model.provider} / ${model.name}`,
	}))
	const defaultValue = data?.defaultModel ? modelKey(data.defaultModel.provider, data.defaultModel.id) : undefined

	return (
		<div className="flex flex-col gap-6">
			<SettingGroup>
				<SettingRow label="默认模型" description="没有打开会话时，新建对话使用这个模型">
					<Select
						className="w-[220px]"
						placeholder={loading ? '加载中' : models.length === 0 ? '无可用模型' : '选择模型'}
						value={defaultValue}
						disabled={loading || savingDefault || models.length === 0}
						options={options}
						searchable
						dropdownWidth={280}
						placement="bottom-end"
						onChange={(value) => void changeDefault(value)}
					/>
				</SettingRow>
			</SettingGroup>

			<SettingGroup title="已配置">
				{configuredBuiltin.length === 0 && configuredCustom.length === 0 ? (
					<SettingRow label={loading ? '加载中' : '还没有已配置的提供商'}>
						<span />
					</SettingRow>
				) : (
					[
						...configuredBuiltin.map((provider) => (
							<SettingRow
								key={`builtin:${provider.id}`}
								label={provider.name}
								description={modelNames(providerModels(provider.id))}
							>
								<Button type="button" variant="ghost" onClick={() => setKeyTarget(provider)}>
									修改
								</Button>
							</SettingRow>
						)),
						...configuredCustom.map((provider) => (
							<SettingRow
								key={`custom:${provider.id}`}
								label={provider.name || provider.id}
								description={modelNames(providerModels(provider.id))}
							>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										onClick={() => {
											setFormProvider(provider)
											setFormOpen(true)
										}}
									>
										修改
									</Button>
									<Button type="button" variant="ghost" onClick={() => setDeleteTarget(provider)}>
										移除
									</Button>
								</div>
							</SettingRow>
						)),
					]
				)}
			</SettingGroup>

			<div>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-medium text-fg-2">内置提供商</h2>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							loading={refreshing}
							disabled={loading}
							onClick={() => void refreshCatalog()}
						>
							刷新模型列表
						</Button>
						<Button
							type="button"
							size="sm"
							tone="inverse"
							disabled={loading || !data}
							onClick={() => {
								setFormProvider(null)
								setFormOpen(true)
							}}
						>
							自定义
						</Button>
					</div>
				</div>
			<SettingGroup>
				<SettingRow label="提供商" description="搜索并选择一个内置提供商来填写密钥">
					<Select
						className="w-[220px]"
						placeholder={loading ? '加载中' : '搜索提供商'}
						value={selectedBuiltinId}
						disabled={loading || builtin.length === 0}
						options={builtinOptions}
						searchable
						dropdownWidth={280}
						placement="bottom-end"
						onChange={(value) => {
							setSelectedBuiltinId(value)
							setEditingKey(false)
							setKeyDraft('')
						}}
					/>
				</SettingRow>
				{selectedBuiltin ? (
					<SettingRow label="API Key" description={selectedBuiltin.configured ? '已配置' : '未配置'}>
						{selectedBuiltin.configured && !editingKey ? (
							<div className="flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									onClick={() => {
										setEditingKey(true)
										setKeyDraft('')
									}}
								>
									更换
								</Button>
								<Button type="button" variant="ghost" onClick={() => setClearTarget(selectedBuiltin)}>
									清除
								</Button>
							</div>
						) : (
							<div className="flex shrink-0 items-center gap-2">
								<Input
									type="password"
									className="w-[180px]"
									value={keyDraft}
									placeholder="API Key"
									disabled={savingKey}
									onChange={setKeyDraft}
								/>
								<Button type="button" tone="inverse" loading={savingKey} onClick={() => void saveKey()}>
									保存
								</Button>
							</div>
						)}
					</SettingRow>
				) : null}
			</SettingGroup>
			</div>

			<CustomProviderDialog
				open={formOpen}
				provider={formProvider}
				meta={meta}
				onClose={() => setFormOpen(false)}
				onSaved={reloadAndPublish}
			/>

			<BuiltinKeyDialog provider={keyTarget} onClose={() => setKeyTarget(null)} onSaved={reloadAndPublish} />

			<Dialog
				open={clearTarget !== null}
				onOpenChange={(open) => {
					if (!open) setClearTarget(null)
				}}
				title="清除密钥"
				body={clearTarget ? `清除后「${clearTarget.name}」将不可用。` : ''}
				confirmText="清除"
				onOk={clearKey}
			/>

			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null)
				}}
				title="移除自定义提供商"
				body={deleteTarget ? `移除「${deleteTarget.name || deleteTarget.id}」后，它的模型会从列表消失。` : ''}
				confirmText="移除"
				onOk={removeCustom}
			/>
		</div>
	)
}

function BuiltinKeyDialog({
	provider,
	onClose,
	onSaved,
}: {
	provider: ProviderSummary | null
	onClose: () => void
	onSaved: () => Promise<void>
}) {
	const titleId = useId()
	const [apiKey, setApiKey] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)
	const open = provider !== null

	useEffect(() => {
		if (!open) return
		setApiKey('')
		setError(null)
		setPending(false)
	}, [open, provider?.id])

	async function submit() {
		if (!provider) return
		const key = apiKey.trim()
		if (!key) {
			setError('请填写 API Key')
			return
		}
		setPending(true)
		setError(null)
		try {
			await putProviderKey(provider.id, key)
			setApiKey('')
			await onSaved()
			onClose()
		} catch (caught) {
			setError(caught instanceof ApiError ? caught.message : '保存密钥失败')
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
			className="w-full max-w-[360px] p-4"
			aria-labelledby={titleId}
		>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					void submit()
				}}
			>
				<Heading id={titleId}>修改 API Key</Heading>
				<div className="mt-1 text-sm text-fg-3">
					保存后覆盖「{provider?.name}」的原密钥，不会回显。
				</div>
				<Input
					autoFocus
					type="password"
					className="mt-3"
					value={apiKey}
					disabled={pending}
					placeholder="新的 API Key"
					status={error ? 'error' : undefined}
					hint={error ?? undefined}
					hintReserve={error != null}
					onChange={setApiKey}
				/>
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
