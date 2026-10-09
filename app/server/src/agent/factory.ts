import { createRequire } from 'node:module'
import { getSupportedThinkingLevels, InMemoryCredentialStore, type Model } from '@earendil-works/pi-ai'
import {
	createAgentSessionFromServices,
	createAgentSessionRuntime,
	createAgentSessionServices,
	type CreateAgentSessionRuntimeFactory,
	ModelRuntime,
	type SessionManager,
} from '@earendil-works/pi-coding-agent'
import { getRelaxAgentDir } from '../config/home.js'
import { extensionFactories } from '../extensions/index.js'

const require = createRequire(import.meta.url)
// 官方包没有 main / exports，只有 src/index.ts。交给基座的 jiti 加载，避免 tsc 编它的源码。
const langfuseExtensionPath = require.resolve('@langfuse/pi-observability-plugin/src/index.ts')

const PROVIDER_ID = 'minimax'
const BASE_URL = 'https://api.minimax.cn/anthropic'
const DEFAULT_MODEL = 'MiniMax-M3'
export const DEFAULT_THINKING_LEVEL = 'medium'

const MINIMAX_MODELS = [
	{
		id: 'MiniMax-M3',
		name: 'MiniMax M3',
		reasoning: true,
		input: ['text', 'image'] as ('text' | 'image')[],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 16_384,
		compat: { forceAdaptiveThinking: true },
	},
]

export type RuntimeFactory = (input: {
	cwd: string
	sessionManager: SessionManager
}) => Promise<{ session: import('@earendil-works/pi-coding-agent').AgentSession }>

let cached: CreateAgentSessionRuntimeFactory | undefined

async function piFactory(): Promise<CreateAgentSessionRuntimeFactory> {
	if (cached) return cached
	const apiKey = process.env.MINIMAX_API_KEY
	if (!apiKey) {
		throw new Error('MINIMAX_API_KEY is not set')
	}
	const modelRuntime = await ModelRuntime.create({
		credentials: new InMemoryCredentialStore(),
		refreshOnCreate: true,
	})
	modelRuntime.registerProvider(PROVIDER_ID, {
		name: 'MiniMax',
		baseUrl: BASE_URL,
		api: 'anthropic-messages',
		apiKey,
		models: MINIMAX_MODELS,
	})
	const model = modelRuntime.getModel(PROVIDER_ID, DEFAULT_MODEL)
	if (!model) {
		throw new Error(`Model "${DEFAULT_MODEL}" not found`)
	}
	cached = async ({ cwd, agentDir, sessionManager, sessionStartEvent }) => {
		const services = await createAgentSessionServices({
			cwd,
			agentDir,
			modelRuntime,
			resourceLoaderOptions: {
				// 磁盘扩展仍不扫。noExtensions 仍会加载 additionalExtensionPaths。
				// 密钥读进程环境变量。LANGFUSE_TRACING_ENABLED=false 时插件自己不上报。
				noExtensions: true,
				additionalExtensionPaths: [langfuseExtensionPath],
				extensionFactories,
				noSkills: true,
				noPromptTemplates: true,
				noThemes: true,
				noContextFiles: true,
			},
		})
		// ponytail: steeringMode / followUpMode 保持基座默认 one-at-a-time（每次出队一条）。
		// 以后设置时调用 session.setSteeringMode / setFollowUpMode（'all' | 'one-at-a-time'），两边各自独立。
		const created = await createAgentSessionFromServices({
			services,
			sessionManager,
			sessionStartEvent,
			model,
			thinkingLevel: DEFAULT_THINKING_LEVEL,
			noTools: 'all',
		})
		return {
			...created,
			services,
			diagnostics: services.diagnostics,
		}
	}
	return cached
}

export async function createPiRuntime(input: {
	cwd: string
	sessionManager: SessionManager
}): Promise<{ session: import('@earendil-works/pi-coding-agent').AgentSession }> {
	const factory = await piFactory()
	const runtime = await createAgentSessionRuntime(factory, {
		cwd: input.cwd,
		agentDir: getRelaxAgentDir(),
		sessionManager: input.sessionManager,
	})
	return runtime
}

export type ModelThinkingLevels = {
	provider: string
	id: string
	defaultThinkingLevel: typeof DEFAULT_THINKING_LEVEL
	thinkingLevels: string[]
}

/** 按已注册模型查可选思考档位。未注册返回 undefined。不打开会话。 */
export function modelThinkingLevels(provider: string, id: string): ModelThinkingLevels | undefined {
	const model = MINIMAX_MODELS.find((item) => item.id === id)
	if (provider !== PROVIDER_ID || !model) return undefined
	return {
		provider: PROVIDER_ID,
		id: model.id,
		defaultThinkingLevel: DEFAULT_THINKING_LEVEL,
		thinkingLevels: getSupportedThinkingLevels(model as Model<'anthropic-messages'>),
	}
}

/** 新会话使用的模型档位。 */
export function defaultModelThinkingLevels(): string[] {
	const found = modelThinkingLevels(PROVIDER_ID, DEFAULT_MODEL)
	if (!found) throw new Error('default model is not registered')
	return found.thinkingLevels
}
