import axios from 'axios'
import { config } from '../config'

export class ApiError extends Error {
	readonly status: number
	readonly code: string

	constructor(status: number, code: string, message: string) {
		super(message)
		this.name = 'ApiError'
		this.status = status
		this.code = code
	}
}

export const http = axios.create({
	baseURL: config.apiBaseUrl,
	timeout: config.requestTimeoutMs,
})

http.interceptors.response.use(
	(response) => response,
	(error: unknown) => {
		if (!axios.isAxiosError(error)) throw error
		const data = error.response?.data as { error?: { code?: unknown; message?: unknown } } | undefined
		const code = typeof data?.error?.code === 'string' ? data.error.code : 'HTTP'
		const message = typeof data?.error?.message === 'string' ? data.error.message : error.message
		throw new ApiError(error.response?.status ?? 0, code, message)
	},
)
