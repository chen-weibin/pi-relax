import { getDefaultModel, getThinkingLevels, listModels, putDefaultModel, type ModelSummary } from '../api/models'
import { selectSessionModel } from '../api/sessions'
import {
	applyLevels,
	emptyChoice,
	modelGroups,
	modelName,
	noteHistory,
	noteSession,
	shownModel,
	shownThinking,
	type ChoiceState,
	type ModelMenuGroup,
	type ModelRef,
	type SessionModel,
} from './modelChoice'

type Store = {
	loaded: boolean
	models: ModelSummary[]
	choice: ChoiceState
}

export type ModelPickerSnapshot = {
	loaded: boolean
	label: string
	disabled: boolean
	thinking: string
	levels: string[]
	groups: ModelMenuGroup[]
	modelLabel: string
	shown: ModelRef | null
}

let store: Store = { loaded: false, models: [], choice: emptyChoice }
let snapshot: ModelPickerSnapshot = toSnapshot(store)
const listeners = new Set<() => void>()
let levelKey = ''
let levelToken = 0
let writeToken = 0

function toSnapshot(next: Store): ModelPickerSnapshot {
	const shown = shownModel(next.choice)
	const thinking = shownThinking(next.choice)
	const disabled = next.loaded && next.models.length === 0 && !shown
	const name = modelName(next.models, shown)
	const label = !next.loaded ? '…' : disabled || !shown ? '无可用模型' : `${name} ${thinking}`
	return {
		loaded: next.loaded,
		label,
		disabled,
		thinking,
		levels: next.choice.levels,
		groups: modelGroups(next.models, next.choice.sessionModel),
		modelLabel: name,
		shown,
	}
}

function publish() {
	snapshot = toSnapshot(store)
	for (const listener of listeners) listener()
}

function commit(choice: ChoiceState) {
	if (choice === store.choice) return
	store = { ...store, choice }
	publish()
	void ensureLevels()
}

export function subscribeModelPicker(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function getModelPickerSnapshot(): ModelPickerSnapshot {
	return snapshot
}

export function getSendChoice(): { provider?: string; model?: string; thinkingLevel?: string } {
	const shown = shownModel(store.choice)
	const thinkingLevel = shownThinking(store.choice)
	return {
		...(shown ? { provider: shown.provider, model: shown.id } : {}),
		...(thinkingLevel ? { thinkingLevel } : {}),
	}
}

export function noteModelSession(
	sessionId: string | null,
	history: { model: SessionModel; thinkingLevel: string } | null,
): void {
	let choice = noteSession(store.choice, sessionId)
	if (sessionId && history) choice = noteHistory(choice, history)
	commit(choice)
}

export function chooseThinking(level: string): void {
	commit({ ...store.choice, thinkingOverride: level })
}

export async function chooseModel(next: ModelRef): Promise<void> {
	const token = ++writeToken
	const previous = store.choice
	commit({ ...previous, override: next })
	try {
		if (store.choice.sessionId) {
			await selectSessionModel(store.choice.sessionId, next.provider, next.id)
			if (token !== writeToken) return
			commit({ ...store.choice, defaultModel: { provider: next.provider, id: next.id } })
		} else {
			const saved = await putDefaultModel(next.provider, next.id)
			if (token !== writeToken) return
			commit({ ...store.choice, defaultModel: { provider: saved.model.provider, id: saved.model.id } })
		}
	} catch (error) {
		if (token === writeToken) commit(previous)
		throw error
	}
}

export function startModelList(): () => void {
	let dead = false
	const token = writeToken
	void Promise.all([listModels(), getDefaultModel()])
		.then(([listed, defaults]) => {
			if (dead) return
			const choice =
				token === writeToken ? { ...store.choice, defaultModel: defaults.model } : store.choice
			store = { loaded: true, models: listed.models, choice }
			publish()
			void ensureLevels()
		})
		.catch(() => {
			if (dead) return
			store = { ...store, loaded: true }
			publish()
		})
	return () => {
		dead = true
	}
}

async function ensureLevels(): Promise<void> {
	const shown = shownModel(store.choice)
	const key = shown ? `${shown.provider}\t${shown.id}` : ''
	if (key === levelKey) return
	levelKey = key
	if (!shown) return
	const token = ++levelToken
	try {
		const body = await getThinkingLevels(shown.provider, shown.id)
		if (token !== levelToken) return
		commit(applyLevels(store.choice, body.thinkingLevels, body.defaultThinkingLevel))
	} catch {
		if (token !== levelToken) return
	}
}
