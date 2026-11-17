import { http } from './http'

export type QueueMode = 'all' | 'one-at-a-time'
export type AbortPolicy = 'clear-then-abort' | 'abort-only'
export type DeleteMode = 'logical' | 'physical'
export type SendWhileBusy = 'queue' | 'interrupt'
export type AbortQueue = 'clear' | 'deliver'

export type RuntimeSettings = {
	steeringMode: QueueMode
	followUpMode: QueueMode
	abortPolicy: AbortPolicy
	sessionDelete: DeleteMode
	projectDelete: DeleteMode
	sendWhileBusy: SendWhileBusy
	abortQueue: AbortQueue
}

export type SettingsPatch = {
	steeringMode?: QueueMode
	followUpMode?: QueueMode
	abortPolicy?: AbortPolicy
	sessionDelete?: DeleteMode
	projectDelete?: DeleteMode
	sendWhileBusy?: SendWhileBusy
	abortQueue?: AbortQueue
}

export async function getSettings(): Promise<RuntimeSettings> {
	const { data } = await http.get<RuntimeSettings>('/api/settings')
	return data
}

export async function patchSettings(patch: SettingsPatch): Promise<RuntimeSettings> {
	const { data } = await http.patch<RuntimeSettings>('/api/settings', patch)
	return data
}
