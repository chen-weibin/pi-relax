import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { getRelaxAgentDir } from '../config/home.js'
import { HttpError } from '../utils/errors.js'

const require = createRequire(import.meta.url)
const { lockSync } = require('proper-lockfile') as {
	lockSync: (file: string, options?: { realpath?: boolean }) => () => void
}

/** 适合 baseUrl + apiKey 的 KnownApi 子集（给表单下拉）。 */
export const CUSTOM_PROVIDER_APIS = [
	'openai-completions',
	'openai-responses',
	'anthropic-messages',
	'google-generative-ai',
	'mistral-conversations',
	'pi-messages',
] as const

export type CustomProviderApi = (typeof CUSTOM_PROVIDER_APIS)[number]

const CUSTOM_API_SET = new Set<string>(CUSTOM_PROVIDER_APIS)

const PROVIDER_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/

export type CustomModelInput = {
	id: string
	name?: string
	reasoning?: boolean
	contextWindow?: number
	maxTokens?: number
}

export type CustomProviderInput = {
	id: string
	name?: string
	baseUrl: string
	api: string
	apiKey?: string
	headers?: Record<string, string>
	authHeader?: boolean
	models: CustomModelInput[]
}

export type CustomModelDto = {
	id: string
	name?: string
	reasoning?: boolean
	contextWindow?: number
	maxTokens?: number
}

export type CustomProviderDto = {
	id: string
	name?: string
	baseUrl: string
	api: string
	apiKeySet: boolean
	headers?: Record<string, string>
	authHeader?: boolean
	models: CustomModelDto[]
}

type ModelsJsonDoc = {
	providers: Record<string, Record<string, unknown>>
	[key: string]: unknown
}

export function modelsJsonPath(): string {
	return join(getRelaxAgentDir(), 'models.json')
}

export function customProviderMeta() {
	return {
		apis: [...CUSTOM_PROVIDER_APIS],
		defaults: {
			api: 'openai-completions' as const,
			contextWindow: 128000,
			maxTokens: 16384,
		},
	}
}

/** 文件里所有 provider id（含误写入的白名单 id；过滤由 models 层做）。 */
export function listModelsJsonProviderIds(): string[] {
	return Object.keys(readModelsJson().providers)
}

export function getModelsJsonProvider(id: string): CustomProviderDto | undefined {
	const raw = readModelsJson().providers[id]
	if (!raw) return undefined
	return toDto(id, raw)
}

export function listModelsJsonProviders(): CustomProviderDto[] {
	return Object.entries(readModelsJson().providers).map(([id, raw]) => toDto(id, raw))
}

/** 创建。已存在 → 409。白名单冲突由调用方先查。 */
export function writeNewProvider(input: CustomProviderInput): CustomProviderDto {
	const normalized = normalizeCreate(input)
	return withLockedDoc((doc) => {
		if (doc.providers[normalized.id]) {
			throw new HttpError(409, 'CONFLICT', 'Custom provider already exists')
		}
		doc.providers[normalized.id] = toFileProvider(normalized, undefined)
		return toDto(normalized.id, doc.providers[normalized.id]!)
	})
}

/**
 * 整表替换更新。apiKey 省略保留原值；传空串 400。
 */
export function writeUpdatedProvider(id: string, input: Omit<CustomProviderInput, 'id'>): CustomProviderDto {
	if (!PROVIDER_ID_RE.test(id)) {
		throw new HttpError(404, 'NOT_FOUND', 'Custom provider not found')
	}
	const normalized = normalizeUpdate(id, input)
	return withLockedDoc((doc) => {
		const existing = doc.providers[id]
		if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Custom provider not found')
		const prevKey = typeof existing.apiKey === 'string' ? existing.apiKey : undefined
		if (normalized.apiKey === undefined && !prevKey?.trim()) {
			throw new HttpError(400, 'BAD_REQUEST', 'apiKey is required')
		}
		doc.providers[id] = toFileProvider(normalized, prevKey)
		return toDto(id, doc.providers[id]!)
	})
}

export function removeProviderFromFile(id: string): void {
	withLockedDoc((doc) => {
		if (!doc.providers[id]) throw new HttpError(404, 'NOT_FOUND', 'Custom provider not found')
		delete doc.providers[id]
		return undefined
	})
}

function normalizeCreate(input: CustomProviderInput): Required<Pick<CustomProviderInput, 'id' | 'baseUrl' | 'api' | 'apiKey' | 'models'>> &
	CustomProviderInput {
	const id = requireProviderId(input.id)
	const baseUrl = requireBaseUrl(input.baseUrl)
	const api = requireApi(input.api)
	const apiKey = requireApiKey(input.apiKey, true)
	const models = requireModels(input.models)
	return {
		id,
		name: optionalName(input.name),
		baseUrl,
		api,
		apiKey,
		headers: optionalHeaders(input.headers),
		authHeader: optionalBoolean(input.authHeader),
		models,
	}
}

function normalizeUpdate(
	id: string,
	input: Omit<CustomProviderInput, 'id'>,
): CustomProviderInput & { id: string; apiKey?: string } {
	if ('id' in input && (input as { id?: unknown }).id !== undefined && (input as { id?: unknown }).id !== id) {
		throw new HttpError(400, 'BAD_REQUEST', 'id cannot be changed')
	}
	const baseUrl = requireBaseUrl(input.baseUrl)
	const api = requireApi(input.api)
	let apiKey: string | undefined
	if (input.apiKey !== undefined) {
		apiKey = requireApiKey(input.apiKey, true)
	}
	const models = requireModels(input.models)
	return {
		id,
		name: optionalName(input.name),
		baseUrl,
		api,
		apiKey,
		headers: optionalHeaders(input.headers),
		authHeader: optionalBoolean(input.authHeader),
		models,
	}
}

function toFileProvider(
	input: CustomProviderInput & { apiKey?: string },
	previousApiKey: string | undefined,
): Record<string, unknown> {
	const apiKey = input.apiKey ?? previousApiKey
	if (!apiKey?.trim()) throw new HttpError(400, 'BAD_REQUEST', 'apiKey is required')
	const out: Record<string, unknown> = {
		baseUrl: input.baseUrl,
		api: input.api,
		apiKey,
		models: input.models.map((model) => {
			const row: Record<string, unknown> = { id: model.id }
			if (model.name) row.name = model.name
			if (model.reasoning !== undefined) row.reasoning = model.reasoning
			if (model.contextWindow !== undefined) row.contextWindow = model.contextWindow
			if (model.maxTokens !== undefined) row.maxTokens = model.maxTokens
			return row
		}),
	}
	if (input.name) out.name = input.name
	if (input.headers && Object.keys(input.headers).length > 0) out.headers = input.headers
	if (input.authHeader !== undefined) out.authHeader = input.authHeader
	return out
}

function toDto(id: string, raw: Record<string, unknown>): CustomProviderDto {
	const apiKey = typeof raw.apiKey === 'string' ? raw.apiKey : ''
	const modelsRaw = Array.isArray(raw.models) ? raw.models : []
	const models: CustomModelDto[] = []
	for (const entry of modelsRaw) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
		const row = entry as Record<string, unknown>
		if (typeof row.id !== 'string' || !row.id) continue
		const model: CustomModelDto = { id: row.id }
		if (typeof row.name === 'string' && row.name) model.name = row.name
		if (typeof row.reasoning === 'boolean') model.reasoning = row.reasoning
		if (typeof row.contextWindow === 'number') model.contextWindow = row.contextWindow
		if (typeof row.maxTokens === 'number') model.maxTokens = row.maxTokens
		models.push(model)
	}
	const dto: CustomProviderDto = {
		id,
		baseUrl: typeof raw.baseUrl === 'string' ? raw.baseUrl : '',
		api: typeof raw.api === 'string' ? raw.api : '',
		apiKeySet: Boolean(apiKey.trim()),
		models,
	}
	if (typeof raw.name === 'string' && raw.name) dto.name = raw.name
	if (raw.headers && typeof raw.headers === 'object' && !Array.isArray(raw.headers)) {
		dto.headers = raw.headers as Record<string, string>
	}
	if (typeof raw.authHeader === 'boolean') dto.authHeader = raw.authHeader
	return dto
}

function readModelsJson(): ModelsJsonDoc {
	const path = modelsJsonPath()
	if (!existsSync(path)) return { providers: {} }
	let parsed: unknown
	try {
		parsed = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
	} catch {
		throw new HttpError(400, 'BAD_REQUEST', `Invalid models.json: ${path}`)
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new HttpError(400, 'BAD_REQUEST', `Invalid models.json: ${path}`)
	}
	const root = parsed as Record<string, unknown>
	const providersRaw = root.providers
	if (providersRaw === undefined) return { ...root, providers: {} }
	if (!providersRaw || typeof providersRaw !== 'object' || Array.isArray(providersRaw)) {
		throw new HttpError(400, 'BAD_REQUEST', `Invalid models.json providers: ${path}`)
	}
	const providers: Record<string, Record<string, unknown>> = {}
	for (const [id, value] of Object.entries(providersRaw as Record<string, unknown>)) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			throw new HttpError(400, 'BAD_REQUEST', `Invalid models.json provider: ${id}`)
		}
		providers[id] = value as Record<string, unknown>
	}
	return { ...root, providers }
}

function withLockedDoc<T>(fn: (doc: ModelsJsonDoc) => T): T {
	const path = modelsJsonPath()
	mkdirSync(dirname(path), { recursive: true })
	if (!existsSync(path)) writeFileSync(path, `${JSON.stringify({ providers: {} }, null, 2)}\n`)
	let release: (() => void) | undefined
	try {
		release = lockWithRetry(path)
		const doc = readModelsJson()
		const result = fn(doc)
		writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`)
		return result
	} finally {
		release?.()
	}
}

/** ponytail: 与 settings 一样，锁冲突时同步空转。 */
function lockWithRetry(path: string): () => void {
	const maxAttempts = 10
	const delayMs = 20
	let last: unknown
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return lockSync(path, { realpath: false })
		} catch (error) {
			const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined
			if (code !== 'ELOCKED' || attempt === maxAttempts) throw error
			last = error
			const start = Date.now()
			while (Date.now() - start < delayMs) {
				// sync wait
			}
		}
	}
	throw last
}

function requireProviderId(value: unknown): string {
	if (typeof value !== 'string' || !value) throw new HttpError(400, 'BAD_REQUEST', 'id is required')
	if (!PROVIDER_ID_RE.test(value)) {
		throw new HttpError(400, 'BAD_REQUEST', 'id must match /^[a-z][a-z0-9_-]{0,63}$/')
	}
	return value
}

function requireBaseUrl(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new HttpError(400, 'BAD_REQUEST', 'baseUrl is required')
	}
	let url: URL
	try {
		url = new URL(value.trim())
	} catch {
		throw new HttpError(400, 'BAD_REQUEST', 'baseUrl must be a valid URL')
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new HttpError(400, 'BAD_REQUEST', 'baseUrl must be http or https')
	}
	return value.trim()
}

function requireApi(value: unknown): CustomProviderApi {
	if (typeof value !== 'string' || !value) throw new HttpError(400, 'BAD_REQUEST', 'api is required')
	if (!CUSTOM_API_SET.has(value)) {
		throw new HttpError(400, 'BAD_REQUEST', `api must be one of: ${CUSTOM_PROVIDER_APIS.join(', ')}`)
	}
	return value as CustomProviderApi
}

function requireApiKey(value: unknown, required: boolean): string {
	if (value === undefined || value === null) {
		if (required) throw new HttpError(400, 'BAD_REQUEST', 'apiKey is required')
		return ''
	}
	if (typeof value !== 'string') throw new HttpError(400, 'BAD_REQUEST', 'apiKey must be a string')
	const key = value.trim()
	if (!key) throw new HttpError(400, 'BAD_REQUEST', 'apiKey is required')
	return key
}

function requireModels(value: unknown): CustomModelInput[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new HttpError(400, 'BAD_REQUEST', 'models must be a non-empty array')
	}
	const models: CustomModelInput[] = []
	const seen = new Set<string>()
	for (const entry of value) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			throw new HttpError(400, 'BAD_REQUEST', 'each model must be an object')
		}
		const row = entry as Record<string, unknown>
		if (typeof row.id !== 'string' || !row.id.trim()) {
			throw new HttpError(400, 'BAD_REQUEST', 'model.id is required')
		}
		const id = row.id.trim()
		if (seen.has(id)) throw new HttpError(400, 'BAD_REQUEST', `duplicate model id: ${id}`)
		seen.add(id)
		const model: CustomModelInput = { id }
		if (row.name !== undefined) {
			if (typeof row.name !== 'string' || !row.name.trim()) {
				throw new HttpError(400, 'BAD_REQUEST', 'model.name must be a non-empty string')
			}
			model.name = row.name.trim()
		}
		if (row.reasoning !== undefined) {
			if (typeof row.reasoning !== 'boolean') {
				throw new HttpError(400, 'BAD_REQUEST', 'model.reasoning must be a boolean')
			}
			model.reasoning = row.reasoning
		}
		if (row.contextWindow !== undefined) {
			if (typeof row.contextWindow !== 'number' || !Number.isFinite(row.contextWindow) || row.contextWindow <= 0) {
				throw new HttpError(400, 'BAD_REQUEST', 'model.contextWindow must be a positive number')
			}
			model.contextWindow = row.contextWindow
		}
		if (row.maxTokens !== undefined) {
			if (typeof row.maxTokens !== 'number' || !Number.isFinite(row.maxTokens) || row.maxTokens <= 0) {
				throw new HttpError(400, 'BAD_REQUEST', 'model.maxTokens must be a positive number')
			}
			model.maxTokens = row.maxTokens
		}
		models.push(model)
	}
	return models
}

function optionalName(value: unknown): string | undefined {
	if (value === undefined) return undefined
	if (typeof value !== 'string' || !value.trim()) {
		throw new HttpError(400, 'BAD_REQUEST', 'name must be a non-empty string')
	}
	return value.trim()
}

function optionalHeaders(value: unknown): Record<string, string> | undefined {
	if (value === undefined) return undefined
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new HttpError(400, 'BAD_REQUEST', 'headers must be an object')
	}
	const out: Record<string, string> = {}
	for (const [key, header] of Object.entries(value as Record<string, unknown>)) {
		if (typeof header !== 'string') {
			throw new HttpError(400, 'BAD_REQUEST', 'headers values must be strings')
		}
		out[key] = header
	}
	return out
}

function optionalBoolean(value: unknown): boolean | undefined {
	if (value === undefined) return undefined
	if (typeof value !== 'boolean') throw new HttpError(400, 'BAD_REQUEST', 'authHeader must be a boolean')
	return value
}
