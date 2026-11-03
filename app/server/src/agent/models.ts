import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getSupportedThinkingLevels, type Model } from '@earendil-works/pi-ai'
import { ModelRuntime, SettingsManager } from '@earendil-works/pi-coding-agent'
import { getDefaultWorkspace, getRelaxAgentDir } from '../config/home.js'
import { HttpError } from '../utils/errors.js'

/**
 * 一把 key 就能对话的内置提供商。pi-ai@1.5.0。
 * 升 @earendil-works/pi-ai 后对照 providers/*.ts 的 auth 再核一次。
 */
export const KEY_PROVIDERS = [
	'ant-ling',
	'anthropic',
	'google',
	'openai',
	'radius',
	'nvidia',
	'deepseek',
	'github-copilot',
	'xai',
	'groq',
	'cerebras',
	'openrouter',
	'vercel-ai-gateway',
	'zai',
	'zai-coding-cn',
	'mistral',
	'minimax',
	'minimax-cn',
	'moonshotai',
	'moonshotai-cn',
	'huggingface',
	'fireworks',
	'together',
	'baseten',
	'opencode',
	'opencode-go',
	'kimi-coding',
	'meta',
	'qwen-token-plan',
	'qwen-token-plan-cn',
	'qwen-token-plan-individual',
	'xiaomi',
	'xiaomi-token-plan-cn',
	'xiaomi-token-plan-ams',
	'xiaomi-token-plan-sgp',
] as const

const KEY_PROVIDER_SET = new Set<string>(KEY_PROVIDERS)

/**
 * 与 pi-coding-agent 1.5.0 `defaultModelPerProvider` 的键顺序一致，只留白名单。
 * 该常量没有从包入口导出。升库时对照 core/model-resolver.ts。
 */
const DEFAULT_MODEL_ORDER: ReadonlyArray<readonly [string, string]> = [
	['ant-ling', 'Ring-2.6-1T'],
	['anthropic', 'claude-opus-4-8'],
	['openai', 'gpt-6.1-sol'],
	['radius', 'balanced'],
	['nvidia', 'nvidia/nemotron-3.5-super-vl-120b-a12b'],
	['deepseek', 'deepseek-v4-pro'],
	['google', 'gemini-3.1-pro-preview'],
	['github-copilot', 'gpt-6.1-sol'],
	['openrouter', 'moonshotai/kimi-k2.6'],
	['vercel-ai-gateway', 'zai/glm-5.1'],
	['xai', 'grok-4.7'],
	['groq', 'openai/gpt-oss-120b'],
	['cerebras', 'gpt-oss-120b'],
	['zai', 'glm-5.3'],
	['zai-coding-cn', 'glm-5.3'],
	['mistral', 'devstral-medium-latest'],
	['minimax', 'MiniMax-M2.7'],
	['minimax-cn', 'MiniMax-M2.7'],
	['moonshotai', 'kimi-k2.6'],
	['moonshotai-cn', 'kimi-k2.6'],
	['huggingface', 'moonshotai/Kimi-K2.6'],
	['fireworks', 'accounts/fireworks/models/kimi-k3'],
	['together', 'moonshotai/Kimi-K3'],
	['baseten', 'zai-org/GLM-5.2'],
	['opencode', 'kimi-k2.6'],
	['opencode-go', 'kimi-k3'],
	['kimi-coding', 'kimi-for-coding'],
	['meta', 'muse-spark-1.3'],
	['qwen-token-plan', 'qwen3.7-max'],
	['qwen-token-plan-cn', 'qwen3.7-max'],
	['qwen-token-plan-individual', 'qwen3.8-max'],
	['xiaomi', 'mimo-v2.6-pro'],
	['xiaomi-token-plan-cn', 'mimo-v2.6-pro'],
	['xiaomi-token-plan-ams', 'mimo-v2.6-pro'],
	['xiaomi-token-plan-sgp', 'mimo-v2.6-pro'],
]

export const DEFAULT_THINKING_LEVEL = 'medium'

export type ModelSummary = {
	provider: string
	id: string
	name: string
	reasoning: boolean
	contextWindow: number
	maxTokens: number
}

export type DefaultModel = {
	provider: string
	id: string
	usable: boolean
}

const runtimes = new Map<string, Promise<ModelRuntime>>()

export function isKeyProvider(id: string): boolean {
	return KEY_PROVIDER_SET.has(id)
}

export function modelRuntime(): Promise<ModelRuntime> {
	const dir = getRelaxAgentDir()
	let pending = runtimes.get(dir)
	if (!pending) {
		pending = ModelRuntime.create({
			authPath: join(dir, 'auth.json'),
			modelsPath: join(dir, 'models.json'),
			refreshOnCreate: true,
		})
		runtimes.set(dir, pending)
	}
	return pending
}

function isChat(model: Model<any>): boolean {
	return model.type === undefined || model.type === 'chat'
}

function summarize(model: Model<any>): ModelSummary {
	return {
		provider: model.provider,
		id: model.id,
		name: model.name,
		reasoning: model.reasoning,
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
	}
}

async function availableChat(): Promise<Model<any>[]> {
	const runtime = await modelRuntime()
	const models = await runtime.getAvailable()
	return models.filter((model) => isKeyProvider(model.provider) && isChat(model))
}

function readGlobalDefault(): { provider?: string; id?: string } {
	const path = join(getRelaxAgentDir(), 'settings.json')
	if (!existsSync(path)) return {}
	try {
		const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
		return {
			provider: typeof raw.defaultProvider === 'string' ? raw.defaultProvider : undefined,
			id: typeof raw.defaultModel === 'string' ? raw.defaultModel : undefined,
		}
	} catch {
		return {}
	}
}

function findModel(models: readonly Model<any>[], provider?: string, id?: string): Model<any> | undefined {
	if (!provider || !id) return undefined
	return models.find((model) => model.provider === provider && model.id === id)
}

function pickDefault(models: readonly Model<any>[]): Model<any> {
	for (const [provider, id] of DEFAULT_MODEL_ORDER) {
		const found = findModel(models, provider, id)
		if (found) return found
	}
	const first = models[0]
	if (!first) throw new Error('no model to pick')
	return first
}

function saveDefault(model: Model<any>): void {
	SettingsManager.create(getDefaultWorkspace(), getRelaxAgentDir()).setDefaultModelAndProvider(
		model.provider,
		model.id,
	)
}

/** 全局还没有一对仍可用的默认时，按基座内置默认顺序补写。没有可用模型则不写。 */
export async function ensureDefault(): Promise<Model<any> | undefined> {
	const models = await availableChat()
	if (models.length === 0) return undefined
	const current = readGlobalDefault()
	const existing = findModel(models, current.provider, current.id)
	if (existing) return existing
	const picked = pickDefault(models)
	saveDefault(picked)
	return picked
}

export async function listProviders(): Promise<Array<{ id: string; name: string; configured: boolean }>> {
	const runtime = await modelRuntime()
	await runtime.getAvailable()
	return KEY_PROVIDERS.flatMap((id) => {
		const provider = runtime.getProvider(id)
		if (!provider) return []
		return [{ id, name: provider.name, configured: runtime.hasConfiguredAuth(id) }]
	})
}

export async function saveApiKey(id: string, apiKey: string): Promise<void> {
	if (!isKeyProvider(id)) throw new HttpError(404, 'NOT_FOUND', 'Provider not found')
	const key = apiKey.trim()
	if (!key) throw new HttpError(400, 'BAD_REQUEST', 'apiKey is required')
	const runtime = await modelRuntime()
	if (!runtime.getProvider(id)) throw new HttpError(404, 'NOT_FOUND', 'Provider not found')
	await runtime.login(id, 'api_key', {
		prompt: async () => key,
		notify() {},
	})
}

export async function deleteApiKey(id: string): Promise<void> {
	if (!isKeyProvider(id)) throw new HttpError(404, 'NOT_FOUND', 'Provider not found')
	const runtime = await modelRuntime()
	if (!runtime.getProvider(id)) throw new HttpError(404, 'NOT_FOUND', 'Provider not found')
	await runtime.logout(id)
}

export async function providerModels(id: string): Promise<ModelSummary[]> {
	if (!isKeyProvider(id)) throw new HttpError(404, 'NOT_FOUND', 'Provider not found')
	const runtime = await modelRuntime()
	if (!runtime.getProvider(id)) throw new HttpError(404, 'NOT_FOUND', 'Provider not found')
	return runtime
		.getModels(id)
		.filter(isChat)
		.map(summarize)
}

export async function availableModels(provider?: string): Promise<{ available: boolean; models: ModelSummary[] }> {
	await ensureDefault()
	const models = await availableChat()
	const filtered = provider ? models.filter((model) => model.provider === provider) : models
	return { available: filtered.length > 0, models: filtered.map(summarize) }
}

export async function readDefault(): Promise<{ model: DefaultModel | null }> {
	const picked = await ensureDefault()
	if (!picked) return { model: null }
	return { model: { provider: picked.provider, id: picked.id, usable: true } }
}

export async function writeDefault(provider: string, id: string): Promise<DefaultModel> {
	const model = await requireModel(provider, id, 400)
	saveDefault(model)
	return { provider: model.provider, id: model.id, usable: true }
}

/** 新建会话要使用的模型。指定一对时写成全局默认。都没有可用模型时 409。 */
export async function modelForNewSession(choice?: { provider: string; id: string }): Promise<Model<any>> {
	if (choice) {
		const model = await requireModel(choice.provider, choice.id, 409)
		saveDefault(model)
		return model
	}
	const model = await ensureDefault()
	if (!model) throw new HttpError(409, 'PROVIDER_REQUIRED', 'No model is available')
	return model
}

export async function modelForSwitch(provider: string, id: string): Promise<Model<any>> {
	return requireModel(provider, id, 409)
}

async function requireModel(provider: string, id: string, unconfigured: 400 | 409): Promise<Model<any>> {
	if (!isKeyProvider(provider)) throw new HttpError(404, 'NOT_FOUND', 'Model not found')
	const runtime = await modelRuntime()
	const model = runtime.getModel(provider, id)
	if (!model || !isChat(model)) throw new HttpError(404, 'NOT_FOUND', 'Model not found')
	await runtime.getAvailable(provider)
	if (!runtime.hasConfiguredAuth(provider)) {
		throw new HttpError(
			unconfigured,
			unconfigured === 409 ? 'PROVIDER_REQUIRED' : 'BAD_REQUEST',
			'Model is not available',
		)
	}
	return model
}

export async function modelThinkingLevels(
	provider: string,
	id: string,
): Promise<
	| {
			provider: string
			id: string
			defaultThinkingLevel: typeof DEFAULT_THINKING_LEVEL
			thinkingLevels: string[]
	  }
	| undefined
> {
	if (!isKeyProvider(provider)) return undefined
	const runtime = await modelRuntime()
	const model = runtime.getModel(provider, id)
	if (!model || !isChat(model)) return undefined
	return {
		provider,
		id: model.id,
		defaultThinkingLevel: DEFAULT_THINKING_LEVEL,
		thinkingLevels: getSupportedThinkingLevels(model),
	}
}

export async function refreshModels(): Promise<{
	providers: Array<{ id: string; ok: boolean; error?: string }>
}> {
	const runtime = await modelRuntime()
	const ids = KEY_PROVIDERS.filter((id) => runtime.getProvider(id))
	const result = await runtime.refresh({ allowNetwork: true, force: true, providers: ids })
	return {
		providers: ids.map((id) => {
			const error = result.errors.get(id)
			return error ? { id, ok: false, error: error.message } : { id, ok: true }
		}),
	}
}
