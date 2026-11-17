import type { CustomModel, CustomProvider, CustomProviderBody } from '../../api/custom-providers'

const PROVIDER_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/

export type CustomModelDraft = {
	id: string
	name: string
	reasoning: boolean
	contextWindow: string
	maxTokens: string
}

export type CustomProviderDraft = {
	id: string
	name: string
	baseUrl: string
	api: string
	apiKey: string
	models: CustomModelDraft[]
}

export function emptyModelDraft(): CustomModelDraft {
	return { id: '', name: '', reasoning: false, contextWindow: '', maxTokens: '' }
}

export function emptyProviderDraft(api: string): CustomProviderDraft {
	return { id: '', name: '', baseUrl: '', api, apiKey: '', models: [emptyModelDraft()] }
}

export function draftFromProvider(provider: CustomProvider): CustomProviderDraft {
	const models = provider.models.length
		? provider.models.map((model) => ({
				id: model.id,
				name: model.name ?? '',
				reasoning: model.reasoning ?? false,
				contextWindow: model.contextWindow != null ? String(model.contextWindow) : '',
				maxTokens: model.maxTokens != null ? String(model.maxTokens) : '',
			}))
		: [emptyModelDraft()]
	return {
		id: provider.id,
		name: provider.name ?? '',
		baseUrl: provider.baseUrl,
		api: provider.api,
		apiKey: '',
		models,
	}
}

export function customProviderPayload(
	draft: CustomProviderDraft,
	mode: 'create' | 'update',
): { ok: true; body: CustomProviderBody } | { ok: false; error: string } {
	const id = draft.id.trim()
	if (mode === 'create' && !PROVIDER_ID_RE.test(id)) {
		return { ok: false, error: '标识需以小写字母开头，只含小写字母、数字、下划线或连字符' }
	}

	const baseUrl = draft.baseUrl.trim()
	let url: URL
	try {
		url = new URL(baseUrl)
	} catch {
		return { ok: false, error: 'Base URL 必须是 http 或 https 地址' }
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return { ok: false, error: 'Base URL 必须是 http 或 https 地址' }
	}

	const api = draft.api.trim()
	if (!api) return { ok: false, error: '请选择接口' }

	const apiKey = draft.apiKey.trim()
	if (mode === 'create' && !apiKey) return { ok: false, error: '请填写 API Key' }

	if (draft.models.length === 0) return { ok: false, error: '至少添加一个模型' }

	const models: CustomModel[] = []
	const seen = new Set<string>()
	for (const row of draft.models) {
		const modelId = row.id.trim()
		if (!modelId) return { ok: false, error: '请填写模型 id' }
		if (seen.has(modelId)) return { ok: false, error: `模型 id 重复：${modelId}` }
		seen.add(modelId)
		const model: CustomModel = { id: modelId, reasoning: row.reasoning }
		const name = row.name.trim()
		if (name) model.name = name
		const contextWindow = positiveNumber('上下文窗口', row.contextWindow)
		if (!contextWindow.ok) return contextWindow
		if (contextWindow.value !== undefined) model.contextWindow = contextWindow.value
		const maxTokens = positiveNumber('最大输出', row.maxTokens)
		if (!maxTokens.ok) return maxTokens
		if (maxTokens.value !== undefined) model.maxTokens = maxTokens.value
		models.push(model)
	}

	const body: CustomProviderBody = { baseUrl, api, models }
	if (mode === 'create') body.id = id
	const name = draft.name.trim()
	if (name) body.name = name
	if (apiKey) body.apiKey = apiKey
	return { ok: true, body }
}

function positiveNumber(
	label: string,
	raw: string,
): { ok: true; value?: number } | { ok: false; error: string } {
	const text = raw.trim()
	if (!text) return { ok: true }
	const value = Number(text)
	if (!Number.isFinite(value) || value <= 0) return { ok: false, error: `${label}须为正数` }
	return { ok: true, value }
}
