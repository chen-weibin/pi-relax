import { getSettings, type RuntimeSettings } from '../api/settings'

let value: RuntimeSettings | null = null
let inflight: Promise<RuntimeSettings> | null = null

export function noteRuntimeSettings(next: RuntimeSettings) {
	value = next
	inflight = Promise.resolve(next)
}

export function runtimeSettings(): Promise<RuntimeSettings> {
	if (value) return Promise.resolve(value)
	if (!inflight) {
		inflight = getSettings()
			.then((settings) => {
				if (!value) value = settings
				return value
			})
			.catch((error: unknown) => {
				inflight = null
				throw error
			})
	}
	return inflight
}
