export type ModelRef = { provider: string; id: string }

export type SessionModel = { provider: string; modelId: string } | null

export type ChoiceState = {
	sessionId: string | null
	override: ModelRef | null
	thinkingOverride: string | null
	sessionModel: SessionModel
	sessionThinking: string | null
	defaultModel: ModelRef | null
	levels: string[]
	defaultLevel: string
}

export const emptyChoice: ChoiceState = {
	sessionId: null,
	override: null,
	thinkingOverride: null,
	sessionModel: null,
	sessionThinking: null,
	defaultModel: null,
	levels: [],
	defaultLevel: 'medium',
}

export function shownModel(state: ChoiceState): ModelRef | null {
	if (state.override) return state.override
	if (state.sessionModel) return { provider: state.sessionModel.provider, id: state.sessionModel.modelId }
	return state.defaultModel
}

/** 档位列表还没到时保留当前值。到了之后，不支持的档位落到默认，默认也不在就用第一项。 */
export function nextLevel(current: string | null, levels: readonly string[], fallback: string): string {
	if (levels.length === 0) return current || fallback
	if (current && levels.includes(current)) return current
	if (levels.includes(fallback)) return fallback
	return levels[0] ?? fallback
}

export function shownThinking(state: ChoiceState): string {
	return nextLevel(state.thinkingOverride ?? state.sessionThinking, state.levels, state.defaultLevel)
}

export function noteSession(state: ChoiceState, sessionId: string | null): ChoiceState {
	if (state.sessionId === sessionId) return state
	return {
		...state,
		sessionId,
		override: null,
		thinkingOverride: null,
		sessionModel: null,
		sessionThinking: null,
	}
}

export function noteHistory(
	state: ChoiceState,
	history: { model: SessionModel; thinkingLevel: string },
): ChoiceState {
	return { ...state, sessionModel: history.model, sessionThinking: history.thinkingLevel }
}

export function applyLevels(state: ChoiceState, levels: readonly string[], defaultLevel: string): ChoiceState {
	const current = state.thinkingOverride ?? state.sessionThinking
	const next = nextLevel(current, levels, defaultLevel)
	const thinkingOverride = levels.length > 0 && next !== current ? next : state.thinkingOverride
	return { ...state, levels: [...levels], defaultLevel, thinkingOverride }
}

export type ModelMenuRow = {
	provider: string
	id: string
	label: string
	unavailable?: boolean
}

export type ModelMenuGroup = {
	label?: string
	rows: ModelMenuRow[]
}

export function modelGroups(
	models: readonly { provider: string; id: string; name: string }[],
	sessionModel: SessionModel,
): ModelMenuGroup[] {
	const groups: ModelMenuGroup[] = []
	const listed = sessionModel
		? models.some((model) => model.provider === sessionModel.provider && model.id === sessionModel.modelId)
		: true
	if (sessionModel && !listed) {
		groups.push({
			rows: [
				{
					provider: sessionModel.provider,
					id: sessionModel.modelId,
					label: `${sessionModel.provider}/${sessionModel.modelId} · 不在可用列表`,
					unavailable: true,
				},
			],
		})
	}
	const byProvider = new Map<string, ModelMenuRow[]>()
	for (const model of models) {
		const rows = byProvider.get(model.provider) ?? []
		rows.push({ provider: model.provider, id: model.id, label: model.name || model.id })
		byProvider.set(model.provider, rows)
	}
	for (const [label, rows] of byProvider) groups.push({ label, rows })
	return groups
}

export function modelName(
	models: readonly { provider: string; id: string; name: string }[],
	ref: ModelRef | null,
): string {
	if (!ref) return ''
	const hit = models.find((model) => model.provider === ref.provider && model.id === ref.id)
	return hit?.name || ref.id
}
