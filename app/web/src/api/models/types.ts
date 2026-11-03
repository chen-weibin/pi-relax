export type ModelSummary = {
	provider: string
	id: string
	name: string
	reasoning: boolean
	contextWindow: number
	maxTokens: number
}

export type AvailableModels = {
	available: boolean
	models: ModelSummary[]
}

export type DefaultModel = {
	provider: string
	id: string
	usable: boolean
}

export type ThinkingLevels = {
	provider: string
	id: string
	defaultThinkingLevel: string
	thinkingLevels: string[]
}
