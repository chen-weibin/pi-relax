import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { startObservation } from '@langfuse/tracing'
import { TraceFlags, type SpanContext } from '@opentelemetry/api'

const OBSERVATION_NAME = 'Provider Request'
const REDACTED = '[redacted]'
const PARENT_TRACE_ID = 'LANGFUSE_PI_PARENT_TRACE_ID'
const PARENT_SPAN_ID = 'LANGFUSE_PI_PARENT_SPAN_ID'
const HEX_TRACE_ID = /^[0-9a-f]{32}$/
const HEX_SPAN_ID = /^[0-9a-f]{16}$/
const LANGFUSE_KEY = String.raw`\b[sp]k-lf-[\w-]+\b`

function tracingEnabled(): boolean {
	if ((process.env.LANGFUSE_TRACING_ENABLED ?? '').trim().toLowerCase() === 'false') return false
	return Boolean(process.env.LANGFUSE_PUBLIC_KEY?.trim() && process.env.LANGFUSE_SECRET_KEY?.trim())
}

function secretValues(): string[] {
	const values: string[] = []
	for (const [name, value] of Object.entries(process.env)) {
		if (!value?.trim()) continue
		if (
			name === 'LANGFUSE_PUBLIC_KEY' ||
			name === 'LANGFUSE_SECRET_KEY' ||
			name.endsWith('_API_KEY') ||
			name === 'HF_TOKEN' ||
			name === 'COPILOT_GITHUB_TOKEN' ||
			name === 'ANTHROPIC_AUTH_TOKEN' ||
			name === 'ANTHROPIC_OAUTH_TOKEN'
		) {
			values.push(value)
		}
	}
	return values
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 把密钥从即将上传的请求体里换掉。名为 apiKey 的字段会整段打码。请求头里的 Authorization 不在 payload 里。 */
export function redactProviderPayload(payload: unknown, secrets: readonly string[]): unknown {
	const pattern = new RegExp([...secrets.filter((secret) => secret.length > 0).map(escapeRegExp), LANGFUSE_KEY].join('|'), 'g')
	const walk = (value: unknown, seen: WeakSet<object>): unknown => {
		if (typeof value === 'string') {
			pattern.lastIndex = 0
			return value.replace(pattern, REDACTED)
		}
		if (value === null || typeof value !== 'object') return value
		if (seen.has(value)) return '[circular]'
		seen.add(value)
		if (Array.isArray(value)) return value.map((item) => walk(item, seen))
		const fields: Record<string, unknown> = {}
		const SECRET_FIELDS = new Set(['apikey', 'api_key', 'authorization'])
		for (const [key, field] of Object.entries(value)) {
			fields[key] = SECRET_FIELDS.has(key.toLowerCase()) && typeof field === 'string' ? REDACTED : walk(field, seen)
		}
		return fields
	}
	return walk(payload, new WeakSet())
}

function parentSpanContext(): SpanContext | undefined {
	const traceId = process.env[PARENT_TRACE_ID]?.trim().toLowerCase()
	const spanId = process.env[PARENT_SPAN_ID]?.trim().toLowerCase()
	if (!traceId || !spanId || !HEX_TRACE_ID.test(traceId) || !HEX_SPAN_ID.test(spanId)) return undefined
	if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) return undefined
	return { traceId, spanId, traceFlags: TraceFlags.SAMPLED, isRemote: true }
}

function payloadModel(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined
	const model = (payload as { model?: unknown }).model
	return typeof model === 'string' && model.trim() ? model : undefined
}

/** 每次真正调用模型 API 前，把请求体挂到官方插件当前这条 turn 上。 */
export function providerRequestTrace(pi: ExtensionAPI): void {
	pi.on('before_provider_request', (event) => {
		if (!tracingEnabled()) return
		try {
			const parent = parentSpanContext()
			const input = redactProviderPayload(event.payload, secretValues())
			const model = payloadModel(input)
			const observation = startObservation(
				OBSERVATION_NAME,
				{ input, ...(model ? { model } : {}) },
				{ asType: 'generation', ...(parent ? { parentSpanContext: parent } : {}) },
			)
			observation.end()
		} catch {
			// 上报失败不能改请求，也不能挡住发送。
		}
	})
}
