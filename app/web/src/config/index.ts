const rawBaseUrl = import.meta.env.VITE_API_BASE_URL
if (!rawBaseUrl) throw new Error('VITE_API_BASE_URL is required')

/** 业务代码只从这里拿，不读 import.meta.env。apiBaseUrl 不带末尾斜杠。requestTimeoutMs 只给 axios，SSE 长连接不用。 */
export const config = {
	apiBaseUrl: rawBaseUrl.replace(/\/$/, ''),
	requestTimeoutMs: 5 * 60 * 1000,
}
