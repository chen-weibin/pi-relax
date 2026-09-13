import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "minimax"
const BASE_URL = "https://api.minimax.cn/anthropic"
const API_KEY = "sk-cp-eghljgHnCn8Yl6eVyD06eB1Xwyqjel5OwJ2sldicdEXFG2X9cc8QsA58ae7hP0CMKlR-qvf1RtL4I4Kf71ytNL8ohQCyrqNiVgKL282zkoxupYKFd6UttLs"
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
	}
]

const modelRuntime = await ModelRuntime.create({
	credentials: new InMemoryCredentialStore(),
	refreshOnCreate: true,
})


modelRuntime.registerProvider(PROVIDER_ID, {
	name: "MiniMax",
	baseUrl: BASE_URL,
	api: "anthropic-messages",
	apiKey: API_KEY,
	models: MINIMAX_MODELS,
})

const model = modelRuntime.getModel(PROVIDER_ID, DEFAULT_MODEL)
if (!model) {
	throw new Error(`Model "${DEFAULT_MODEL}" not found in provider "${PROVIDER_ID}"`)
}

const { session } = await createAgentSession({
	model,
	modelRuntime,
	thinkingLevel: "off",
	sessionManager: SessionManager.inMemory(),
})

session.subscribe((event) => {
	// console.log(JSON.stringify(event, null, 4))
	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		process.stdout.write(event.assistantMessageEvent.delta);
	}
});

async function main() {
	// console.log(session.systemPrompt);
	// console.log('🚀', '-----')

	await session.prompt("你好");
}

main()