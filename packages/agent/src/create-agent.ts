import { InMemoryCredentialStore } from "@earendil-works/pi-ai"
import type { ThinkingLevel } from "@earendil-works/pi-agent-core"
import {
	SessionManager,
	type CreateAgentSessionResult,
	ModelRuntime,
	createAgentSession,
} from "@earendil-works/pi-coding-agent"

const PROVIDER_ID = "minimax"
const BASE_URL = "https://api.minimax.cn/anthropic"
const DEFAULT_MODEL = "MiniMax-M3"

type ModelConfig = {
	id: string
	name: string
	reasoning: boolean
	input: ("text" | "image")[]
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number }
	contextWindow: number
	maxTokens: number
	compat?: { forceAdaptiveThinking?: boolean }
}

const MINIMAX_MODELS: ModelConfig[] = [
	{
		id: "MiniMax-M3",
		name: "MiniMax M3",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 16_384,
		compat: { forceAdaptiveThinking: true },
	},
	{
		id: "MiniMax-M2.7",
		name: "MiniMax M2.7",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 204_800,
		maxTokens: 8_192,
	},
	{
		id: "MiniMax-M2.7-highspeed",
		name: "MiniMax M2.7 Highspeed",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 204_800,
		maxTokens: 8_192,
	},
	{
		id: "MiniMax-M2.5",
		name: "MiniMax M2.5",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 204_800,
		maxTokens: 8_192,
	},
	{
		id: "MiniMax-M2.5-highspeed",
		name: "MiniMax M2.5 Highspeed",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 204_800,
		maxTokens: 8_192,
	},
	{
		id: "MiniMax-M2.1",
		name: "MiniMax M2.1",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 204_800,
		maxTokens: 8_192,
	},
	{
		id: "MiniMax-M2.1-highspeed",
		name: "MiniMax M2.1 Highspeed",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 204_800,
		maxTokens: 8_192,
	},
	{
		id: "MiniMax-M2",
		name: "MiniMax M2",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 204_800,
		maxTokens: 8_192,
	},
]

export interface CreateAgentOptions {
	model?: string
	apiKey: string
	thinkingLevel?: ThinkingLevel
	cwd?: string
	sessionManager?: SessionManager
}

export type CreateAgentResult = CreateAgentSessionResult

export async function createAgent(opts: CreateAgentOptions): Promise<CreateAgentResult> {
	const modelId = opts.model ?? DEFAULT_MODEL

	const modelRuntime = await ModelRuntime.create({
		credentials: new InMemoryCredentialStore(),
		refreshOnCreate: true,
	})

	modelRuntime.registerProvider(PROVIDER_ID, {
		name: "MiniMax",
		baseUrl: BASE_URL,
		api: "anthropic-messages",
		apiKey: opts.apiKey,
		models: MINIMAX_MODELS,
	})

	const model = modelRuntime.getModel(PROVIDER_ID, modelId)
	if (!model) {
		throw new Error(`Model "${modelId}" not found in provider "${PROVIDER_ID}"`)
	}

	return createAgentSession({
		cwd: opts.cwd ?? process.cwd(),
		model,
		modelRuntime,
		thinkingLevel: opts.thinkingLevel ?? "off",
		sessionManager: opts.sessionManager ?? SessionManager.inMemory(),
	})
}

// ponytail: 每次 createAgent 都会重建 ModelRuntime,纯函数式,多租户安全。
// 需要复用 catalog 缓存时,把 ModelRuntime 提到模块层即可。
