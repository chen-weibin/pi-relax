import { InMemoryCredentialStore } from '@earendil-works/pi-ai'
import {
	createAgentSessionFromServices,
	createAgentSessionRuntime,
	createAgentSessionServices,
	type CreateAgentSessionRuntimeFactory,
	ModelRuntime,
	type SessionManager,
} from '@earendil-works/pi-coding-agent'
import { getRelaxAgentDir } from '../config/home.js'

const PROVIDER_ID = 'minimax'
const BASE_URL = 'https://api.minimax.cn/anthropic'
const DEFAULT_MODEL = 'MiniMax-M3'

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
				noExtensions: true,
				noSkills: true,
				noPromptTemplates: true,
				noThemes: true,
				noContextFiles: true,
			},
		})
		const created = await createAgentSessionFromServices({
			services,
			sessionManager,
			sessionStartEvent,
			model,
			thinkingLevel: 'medium',
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
